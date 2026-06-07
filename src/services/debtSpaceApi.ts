import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/services/firebase';
import type { PaymentFrequency } from '@/domain/finance';

export type DebtSpaceEntryType = 'note' | 'payment' | 'correction' | 'agreement';

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
  principalAmount: number;
  currentBalance: number;
  minimumPayment: number;
  interestRate: number;
  firstPaymentDate?: string;
  paymentFrequency: PaymentFrequency;
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
  createdAt: string;
}

export interface CreateDebtSpaceInput {
  title: string;
  counterpartyName: string;
  currency: string;
  principalAmount: number;
  currentBalance: number;
  minimumPayment: number;
  interestRate: number;
  firstPaymentDate: string;
  paymentFrequency: PaymentFrequency;
  openingNote: string;
}

const createDebtSpaceInviteFunction = httpsCallable(functions, 'createDebtSpaceInvite');
const acceptDebtSpaceInviteFunction = httpsCallable(functions, 'acceptDebtSpaceInvite');

function normalizeSpace(id: string, value: Record<string, unknown>): DebtSpace {
  return {
    id,
    title: String(value.title || 'Shared debt'),
    counterpartyName: String(value.counterpartyName || 'Shared member'),
    currency: String(value.currency || 'USD'),
    principalAmount: Number(value.principalAmount || 0),
    currentBalance: Number(value.currentBalance || value.principalAmount || 0),
    minimumPayment: Number(value.minimumPayment || 0),
    interestRate: Number(value.interestRate || 0),
    firstPaymentDate: String(value.firstPaymentDate || ''),
    paymentFrequency: ['weekly', 'monthly', 'yearly'].includes(String(value.paymentFrequency))
      ? String(value.paymentFrequency) as PaymentFrequency
      : 'monthly',
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
    type: ['note', 'payment', 'correction', 'agreement'].includes(String(value.type))
      ? String(value.type) as DebtSpaceEntryType
      : 'note',
    authorId: String(value.authorId || ''),
    authorName: String(value.authorName || 'Loop user'),
    note: String(value.note || ''),
    amount: typeof value.amount === 'number' ? value.amount : value.amount ? Number(value.amount) : null,
    createdAt: typeof createdAt === 'string'
      ? createdAt
      : createdAt && typeof createdAt === 'object' && 'toDate' in createdAt
        ? (createdAt as { toDate: () => Date }).toDate().toISOString()
        : '',
  };
}

export async function createDebtSpaceInvite(input: CreateDebtSpaceInput) {
  const response = await createDebtSpaceInviteFunction(input);
  return response.data as { ok: boolean; spaceId: string; inviteToken: string };
}

export async function acceptDebtSpaceInvite(input: { spaceId: string; inviteToken: string }) {
  const response = await acceptDebtSpaceInviteFunction(input);
  return response.data as { ok: boolean };
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
  input: { type: DebtSpaceEntryType; note: string; amount?: number | null },
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
    createdAt: new Date().toISOString(),
    createdAtServer: serverTimestamp(),
  };

  if (input.type !== 'payment' && input.type !== 'correction') {
    return addDoc(collection(db, 'debtSpaces', spaceId, 'entries'), entry);
  }

  const spaceRef = doc(db, 'debtSpaces', spaceId);
  const entryRef = doc(collection(db, 'debtSpaces', spaceId, 'entries'));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(spaceRef);
    const currentBalance = Number(snapshot.data()?.currentBalance || snapshot.data()?.principalAmount || 0);
    const numericAmount = Number(amount || 0);
    const nextBalance = input.type === 'payment'
      ? Math.max(0, currentBalance - Math.max(0, numericAmount))
      : Math.max(0, currentBalance + numericAmount);

    transaction.set(entryRef, entry);
    transaction.update(spaceRef, {
      currentBalance: nextBalance,
      updatedAt: new Date().toISOString(),
    });
  });

  return entryRef;
}

export async function updateDebtSpaceEntry(spaceId: string, entryId: string, input: { note: string; amount?: number | null }) {
  return updateDoc(doc(db, 'debtSpaces', spaceId, 'entries', entryId), {
    note: input.note.trim().slice(0, 2000),
    amount: input.amount ?? null,
    updatedAt: new Date().toISOString(),
  });
}
