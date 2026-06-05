import { onRequest } from 'firebase-functions/v2/https';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

initializeApp();

const db = getFirestore();

function hashAccessCode(code: string) {
  return createHash('sha256').update(code.trim()).digest('hex');
}

async function getVerifiedShare(shareId: string, accessCode: string) {
  if (!shareId || !accessCode) {
    throw new HttpsError('invalid-argument', 'Share ID and access code are required.');
  }

  const snapshot = await db.collection('debtShares').doc(shareId).get();

  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Share not found.');
  }

  const data = snapshot.data();

  if (!data || data.accessCodeHash !== hashAccessCode(accessCode)) {
    throw new HttpsError('permission-denied', 'Invalid access code.');
  }

  return { snapshot, data };
}

export const health = onRequest((_, response) => {
  response.json({
    ok: true,
    service: 'loop-finance-functions',
  });
});

export const publishDebtShare = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { shareId, accessCode, debt, paymentPlan } = request.data || {};

  if (!shareId || !accessCode || !debt || !paymentPlan) {
    throw new HttpsError('invalid-argument', 'Share ID, access code, debt, and payment plan are required.');
  }

  await db.collection('debtShares').doc(String(shareId)).set(
    {
      ownerId: request.auth.uid,
      accessCodeHash: hashAccessCode(String(accessCode)),
      debt,
      paymentPlan,
      lenderNote: '',
      acknowledgedAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { ok: true };
});

export const getDebtShare = onCall(async (request) => {
  const { shareId, accessCode } = request.data || {};
  const { data } = await getVerifiedShare(String(shareId || ''), String(accessCode || ''));

  return {
    debt: data.debt,
    paymentPlan: data.paymentPlan,
    lenderNote: data.lenderNote || '',
    acknowledgedAt: data.acknowledgedAt || null,
  };
});

export const submitDebtShareAction = onCall(async (request) => {
  const { shareId, accessCode, lenderNote, acknowledge } = request.data || {};
  const { snapshot } = await getVerifiedShare(String(shareId || ''), String(accessCode || ''));
  const update: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (typeof lenderNote === 'string') {
    update.lenderNote = lenderNote.trim().slice(0, 1000);
  }

  if (acknowledge === true) {
    update.acknowledgedAt = new Date().toISOString();
  }

  await snapshot.ref.set(update, { merge: true });

  return { ok: true };
});
