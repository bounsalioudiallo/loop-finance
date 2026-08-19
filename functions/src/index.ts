import { createHash, randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const INVITE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_TTL_MS = 24 * 60 * 60 * 1000;

function cleanText(value: unknown, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeInviteCode(value: unknown) {
  return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH);
}

function hashInviteCode(code: string) {
  return createHash('sha256').update(normalizeInviteCode(code)).digest('hex');
}

function randomInviteCode() {
  const bytes = randomBytes(INVITE_CODE_LENGTH);
  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join('');
}

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomInviteCode();
    const collision = await db.collection('debtSpaces')
      .where('inviteCodeHash', '==', hashInviteCode(code))
      .limit(1)
      .get();

    if (collision.empty) return code;
  }

  throw new HttpsError('resource-exhausted', 'A new invitation code could not be created. Try again.');
}

function profileForRequest(request: { auth?: { token?: Record<string, unknown> } | null }) {
  const token = request.auth?.token || {};
  const email = cleanText(token.email);

  return {
    displayName: cleanText(token.name, email.split('@')[0] || 'Loop user').slice(0, 120),
    email: email.slice(0, 254),
    photoURL: cleanText(token.picture).slice(0, 1000),
  };
}

function normalizedCurrency(value: unknown) {
  const currency = cleanText(value, 'XAF').toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'XAF';
}

function codeIsExpired(value: unknown) {
  const expiresAt = Date.parse(cleanText(value));
  return !Number.isFinite(expiresAt) || expiresAt <= Date.now();
}

async function findSpaceForCode(inviteCode: string) {
  const snapshot = await db.collection('debtSpaces')
    .where('inviteCodeHash', '==', hashInviteCode(inviteCode))
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'That invitation code is not valid.');
  }

  const space = snapshot.docs[0];
  if (codeIsExpired(space.data().inviteCodeExpiresAt)) {
    throw new HttpsError('deadline-exceeded', 'That invitation code has expired. Ask for a new one.');
  }

  return space;
}

export const createDebtSpaceInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const existingSpaceId = cleanText(request.data?.spaceId);
  const inviteCode = await createUniqueInviteCode();
  const inviteCodeHash = hashInviteCode(inviteCode);
  const now = new Date().toISOString();
  const inviteCodeExpiresAt = new Date(Date.now() + INVITE_CODE_TTL_MS).toISOString();

  if (existingSpaceId) {
    const spaceRef = db.collection('debtSpaces').doc(existingSpaceId);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(spaceRef);
      if (!snapshot.exists) throw new HttpsError('not-found', 'Shared debt not found.');

      const memberIds = Array.isArray(snapshot.data()?.memberIds)
        ? snapshot.data()!.memberIds.map(String)
        : [];

      if (!memberIds.includes(request.auth!.uid)) {
        throw new HttpsError('permission-denied', 'Only members can create an invitation.');
      }
      if (memberIds.length >= 2) {
        throw new HttpsError('failed-precondition', 'This shared debt is already connected.');
      }

      transaction.set(spaceRef, { inviteCodeHash, inviteCodeExpiresAt, updatedAt: now }, { merge: true });
    });

    return { ok: true, spaceId: existingSpaceId, inviteCode, inviteCodeExpiresAt };
  }

  const counterpartyName = cleanText(request.data?.counterpartyName).slice(0, 120);
  if (!counterpartyName) {
    throw new HttpsError('invalid-argument', 'A person is required.');
  }

  const spaceRef = db.collection('debtSpaces').doc();
  const creatorProfile = {
    ...profileForRequest(request),
    role: 'creator',
    joinedAt: now,
  };

  await spaceRef.set({
    title: counterpartyName,
    counterpartyName,
    currency: normalizedCurrency(request.data?.currency),
    currentBalance: 0,
    balanceByUser: { [request.auth.uid]: 0 },
    createdBy: request.auth.uid,
    memberIds: [request.auth.uid],
    memberProfiles: { [request.auth.uid]: creatorProfile },
    inviteCodeHash,
    inviteCodeExpiresAt,
    inviteAcceptedBy: null,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, spaceId: spaceRef.id, inviteCode, inviteCodeExpiresAt };
});

export const previewDebtSpaceInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const inviteCode = normalizeInviteCode(request.data?.inviteCode);
  if (inviteCode.length !== INVITE_CODE_LENGTH) {
    throw new HttpsError('invalid-argument', 'Enter the complete six-character code.');
  }

  const space = await findSpaceForCode(inviteCode);
  const data = space.data();
  const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];

  if (memberIds.length >= 2 && !memberIds.includes(request.auth.uid)) {
    throw new HttpsError('failed-precondition', 'This shared debt is already connected.');
  }

  return {
    ok: true,
    spaceId: space.id,
    inviterName: cleanText(data.memberProfiles?.[data.createdBy]?.displayName, 'Someone'),
    alreadyJoined: memberIds.includes(request.auth.uid),
  };
});

export const acceptDebtSpaceInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const inviteCode = normalizeInviteCode(request.data?.inviteCode);
  if (inviteCode.length !== INVITE_CODE_LENGTH) {
    throw new HttpsError('invalid-argument', 'Enter the complete six-character code.');
  }

  const foundSpace = await findSpaceForCode(inviteCode);
  const spaceRef = foundSpace.ref;
  const joinedAt = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(spaceRef);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Shared debt not found.');

    const data = snapshot.data() || {};
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];

    if (memberIds.includes(request.auth!.uid)) return;
    if (memberIds.length >= 2) {
      throw new HttpsError('failed-precondition', 'This shared debt is already connected.');
    }
    if (data.inviteCodeHash !== hashInviteCode(inviteCode) || codeIsExpired(data.inviteCodeExpiresAt)) {
      throw new HttpsError('permission-denied', 'This invitation code is no longer valid.');
    }

    const creatorBalance = Number(data.balanceByUser?.[data.createdBy] || data.currentBalance || 0);
    transaction.set(spaceRef, {
      memberIds: FieldValue.arrayUnion(request.auth!.uid),
      [`memberProfiles.${request.auth!.uid}`]: {
        ...profileForRequest(request),
        role: 'member',
        joinedAt,
      },
      [`balanceByUser.${request.auth!.uid}`]: -creatorBalance,
      inviteCodeHash: null,
      inviteCodeExpiresAt: null,
      inviteAcceptedBy: request.auth!.uid,
      updatedAt: joinedAt,
    }, { merge: true });
  });

  return { ok: true, spaceId: spaceRef.id };
});
