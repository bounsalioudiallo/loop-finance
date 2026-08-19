import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/services/firebase';
import {
  directionImpact,
  type NotebookConfidence,
  type NotebookDirection,
} from '@/domain/debtNotebook';

export type DebtSpaceEntryType = 'money' | 'note' | 'payment' | 'correction' | 'agreement';

export interface DebtSpaceMemberProfile {
  displayName: string;
  email?: string;
  photoURL?: string;
  role?: string;
  joinedAt?: string;
}

export interface DebtSpace {
  id: string;
  title: string;
  counterpartyName: string;
  currency: string;
  currentBalance: number;
  balanceByUser: Record<string, number>;
  createdBy: string;
  memberIds: string[];
  memberProfiles: Record<string, DebtSpaceMemberProfile>;
  createdAt: string;
  updatedAt: string;
}

export interface DebtSpaceEntry {
  id: string;
  type: DebtSpaceEntryType;
  authorId: string;
  authorName: string;
  note: string;
  amount: number | null;
  direction: NotebookDirection;
  reasonCue: string;
  currencyCue: string;
  confidence: NotebookConfidence;
  createdAt: string;
}

export interface CreateDebtSpaceInput {
  counterpartyName: string;
  currency: string;
}

const createDebtSpaceInviteFunction = httpsCallable(functions, 'createDebtSpaceInvite');
const previewDebtSpaceInviteFunction = httpsCallable(functions, 'previewDebtSpaceInvite');
const acceptDebtSpaceInviteFunction = httpsCallable(functions, 'acceptDebtSpaceInvite');

function normalizeSpace(id: string, value: Record<string, unknown>): DebtSpace {
  return {
    id,
    title: String(value.title || 'Shared debt'),
    counterpartyName: String(value.counterpartyName || 'Shared member'),
    currency: String(value.currency || 'USD'),
    currentBalance: Number(value.currentBalance || value.principalAmount || 0),
    balanceByUser: (value.balanceByUser || {}) as Record<string, number>,
    createdBy: String(value.createdBy || ''),
    memberIds: Array.isArray(value.memberIds) ? value.memberIds.map(String) : [],
    memberProfiles: (value.memberProfiles || {}) as Record<string, DebtSpaceMemberProfile>,
    createdAt: String(value.createdAt || ''),
    updatedAt: String(value.updatedAt || ''),
  };
}

function normalizeEntry(id: string, value: Record<string, unknown>): DebtSpaceEntry {
  const createdAt = value.createdAt;

  return {
    id,
    type: ['money', 'note', 'payment', 'correction', 'agreement'].includes(String(value.type))
      ? String(value.type) as DebtSpaceEntryType
      : 'note',
    authorId: String(value.authorId || ''),
    authorName: String(value.authorName || 'Loop user'),
    note: String(value.note || ''),
    amount: typeof value.amount === 'number' ? value.amount : value.amount ? Number(value.amount) : null,
    direction: ['theyOweMe', 'iOweThem', 'iPaidThem', 'theyPaidMe', 'neutral'].includes(String(value.direction))
      ? String(value.direction) as NotebookDirection
      : 'neutral',
    reasonCue: String(value.reasonCue || ''),
    currencyCue: String(value.currencyCue || ''),
    confidence: ['low', 'medium', 'high'].includes(String(value.confidence))
      ? String(value.confidence) as NotebookConfidence
      : 'low',
    createdAt: typeof createdAt === 'string'
      ? createdAt
      : createdAt && typeof createdAt === 'object' && 'toDate' in createdAt
        ? (createdAt as { toDate: () => Date }).toDate().toISOString()
        : '',
  };
}

export async function createDebtSpaceInvite(input: CreateDebtSpaceInput) {
  const response = await createDebtSpaceInviteFunction(input);
  return response.data as { ok: boolean; spaceId: string; inviteCode: string; inviteCodeExpiresAt: string };
}

export async function refreshDebtSpaceInvite(spaceId: string) {
  const response = await createDebtSpaceInviteFunction({ spaceId });
  return response.data as { ok: boolean; spaceId: string; inviteCode: string; inviteCodeExpiresAt: string };
}

export async function previewDebtSpaceInvite(inviteCode: string) {
  const response = await previewDebtSpaceInviteFunction({ inviteCode });
  return response.data as { ok: boolean; spaceId: string; inviterName: string; alreadyJoined: boolean };
}

export async function acceptDebtSpaceInvite(inviteCode: string) {
  const response = await acceptDebtSpaceInviteFunction({ inviteCode });
  return response.data as { ok: boolean; spaceId: string };
}

export function watchDebtSpaces(userId: string, callback: (spaces: DebtSpace[]) => void): Unsubscribe {
  const spacesQuery = query(collection(db, 'debtSpaces'), where('memberIds', 'array-contains', userId));

  return onSnapshot(spacesQuery, (snapshot) => {
    const spaces = snapshot.docs
      .map((item) => normalizeSpace(item.id, item.data()))
      .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

    callback(spaces);
  });
}

export function watchDebtSpace(spaceId: string, callback: (space: DebtSpace | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'debtSpaces', spaceId), (snapshot) => {
    callback(snapshot.exists() ? normalizeSpace(snapshot.id, snapshot.data()) : null);
  });
}

export function watchDebtSpaceEntries(spaceId: string, callback: (entries: DebtSpaceEntry[]) => void): Unsubscribe {
  const entriesQuery = query(collection(db, 'debtSpaces', spaceId, 'entries'), orderBy('createdAt', 'desc'));

  return onSnapshot(entriesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => normalizeEntry(item.id, item.data())));
  });
}

export async function addDebtSpaceEntry(
  spaceId: string,
  input: {
    type: DebtSpaceEntryType;
    note: string;
    amount?: number | null;
    direction?: NotebookDirection;
    reasonCue?: string;
    currencyCue?: string;
    confidence?: NotebookConfidence;
  },
) {
  const user = auth.currentUser;

  if (!user) throw new Error('Authentication is required.');

  const amount = input.amount ?? null;
  const entry = {
    type: input.type,
    authorId: user.uid,
    authorName: user.displayName || user.email?.split('@')[0] || 'Loop user',
    note: input.note.trim().slice(0, 2000),
    amount,
    direction: input.direction || 'neutral',
    reasonCue: input.reasonCue || '',
    currencyCue: input.currencyCue || '',
    confidence: input.confidence || 'low',
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  };

  if (!amount || input.direction === 'neutral' || input.type === 'note' || input.type === 'agreement') {
    return addDoc(collection(db, 'debtSpaces', spaceId, 'entries'), entry);
  }

  const spaceRef = doc(db, 'debtSpaces', spaceId);
  const entryRef = doc(collection(db, 'debtSpaces', spaceId, 'entries'));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(spaceRef);
    const data = snapshot.data() || {};
    const balanceByUser = data.balanceByUser && typeof data.balanceByUser === 'object'
      ? data.balanceByUser as Record<string, number>
      : {};
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];
    const numericAmount = Number(amount || 0);
    const authorImpact = directionImpact(input.direction || 'neutral', numericAmount);
    const updates: Record<string, number | string> = {
      currentBalance: Math.abs(Number(balanceByUser[user.uid] || 0) + authorImpact),
      updatedAt: new Date().toISOString(),
    };

    memberIds.forEach((memberId) => {
      const memberImpact = memberId === user.uid ? authorImpact : -authorImpact;
      updates[`balanceByUser.${memberId}`] = Number(balanceByUser[memberId] || 0) + memberImpact;
    });

    transaction.set(entryRef, entry);
    transaction.update(spaceRef, updates);
  });

  return entryRef;
}

export async function updateDebtSpaceEntry(
  spaceId: string,
  entryId: string,
  input: {
    note: string;
    amount: number | null;
    direction: NotebookDirection;
    reasonCue?: string;
    currencyCue?: string;
    confidence?: NotebookConfidence;
  },
) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication is required.');

  const spaceRef = doc(db, 'debtSpaces', spaceId);
  const entryRef = doc(db, 'debtSpaces', spaceId, 'entries', entryId);

  await runTransaction(db, async (transaction) => {
    const [spaceSnapshot, entrySnapshot] = await Promise.all([
      transaction.get(spaceRef),
      transaction.get(entryRef),
    ]);
    const spaceData = spaceSnapshot.data() || {};
    const entryData = entrySnapshot.data() || {};
    const balanceByUser = spaceData.balanceByUser && typeof spaceData.balanceByUser === 'object'
      ? spaceData.balanceByUser as Record<string, number>
      : {};
    const memberIds = Array.isArray(spaceData.memberIds) ? spaceData.memberIds.map(String) : [];
    const authorId = String(entryData.authorId || '');
    if (authorId !== user.uid) throw new Error('You can only edit entries that belong to you.');

    const oldDirection = ['theyOweMe', 'iOweThem', 'iPaidThem', 'theyPaidMe', 'neutral'].includes(String(entryData.direction))
      ? String(entryData.direction) as NotebookDirection
      : 'neutral';
    const oldAmount = typeof entryData.amount === 'number' ? entryData.amount : entryData.amount ? Number(entryData.amount) : 0;
    const oldImpact = directionImpact(oldDirection, oldAmount);
    const nextImpact = directionImpact(input.direction, Number(input.amount || 0));
    const delta = nextImpact - oldImpact;
    const entryUpdates: Record<string, number | string | null> = {
      note: input.note.trim().slice(0, 2000),
      amount: input.amount,
      direction: input.direction,
      reasonCue: input.reasonCue || '',
      currencyCue: input.currencyCue || '',
      confidence: input.confidence || (input.amount ? 'high' : 'low'),
      updatedAt: new Date().toISOString(),
    };
    const spaceUpdates: Record<string, number | string> = {};

    if (delta !== 0) {
      memberIds.forEach((memberId) => {
        const memberDelta = memberId === authorId ? delta : -delta;
        spaceUpdates[`balanceByUser.${memberId}`] = Number(balanceByUser[memberId] || 0) + memberDelta;
      });
      spaceUpdates.currentBalance = Math.abs(Number(balanceByUser[authorId] || 0) + delta);
      spaceUpdates.updatedAt = new Date().toISOString();
      transaction.update(spaceRef, {
        ...spaceUpdates,
      });
    }

    transaction.update(entryRef, entryUpdates);
  });
}

export async function deleteDebtSpaceEntry(spaceId: string, entryId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication is required.');

  const spaceRef = doc(db, 'debtSpaces', spaceId);
  const entryRef = doc(db, 'debtSpaces', spaceId, 'entries', entryId);

  await runTransaction(db, async (transaction) => {
    const [spaceSnapshot, entrySnapshot] = await Promise.all([
      transaction.get(spaceRef),
      transaction.get(entryRef),
    ]);

    if (!entrySnapshot.exists()) throw new Error('This entry no longer exists.');

    const spaceData = spaceSnapshot.data() || {};
    const entryData = entrySnapshot.data() || {};
    const authorId = String(entryData.authorId || '');

    if (authorId !== user.uid) {
      throw new Error('You can only delete entries that belong to you.');
    }

    const direction = ['theyOweMe', 'iOweThem', 'iPaidThem', 'theyPaidMe', 'neutral'].includes(String(entryData.direction))
      ? String(entryData.direction) as NotebookDirection
      : 'neutral';
    const amount = typeof entryData.amount === 'number' ? entryData.amount : Number(entryData.amount || 0);
    const impact = directionImpact(direction, amount);

    if (impact !== 0) {
      const balanceByUser = spaceData.balanceByUser && typeof spaceData.balanceByUser === 'object'
        ? spaceData.balanceByUser as Record<string, number>
        : {};
      const memberIds = Array.isArray(spaceData.memberIds) ? spaceData.memberIds.map(String) : [];
      const updates: Record<string, number | string> = {
        currentBalance: Math.abs(Number(balanceByUser[authorId] || 0) - impact),
        updatedAt: new Date().toISOString(),
      };

      memberIds.forEach((memberId) => {
        const reversal = memberId === authorId ? -impact : impact;
        updates[`balanceByUser.${memberId}`] = Number(balanceByUser[memberId] || 0) + reversal;
      });

      transaction.update(spaceRef, updates);
    }

    transaction.delete(entryRef);
  });
}
