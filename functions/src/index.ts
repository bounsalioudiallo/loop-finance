import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash, randomBytes } from 'node:crypto';

initializeApp();

const db = getFirestore();
const deepSeekModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

interface AiReview {
  summary: string;
  positives: string[];
  risks: string[];
  suggestedActions: string[];
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}

interface AiReviewFallback {
  summary: string;
  positives: string[];
  risks: string[];
  suggestedActions: string[];
  disclaimer: string;
}

const allocationReviewFallback: AiReviewFallback = {
  summary: 'Loop reviewed this allocation against your rules, debts, and active goals.',
  positives: ['Required rules and debt minimums stay protected.'],
  risks: ['Review the plan if your next income date is uncertain.'],
  suggestedActions: ['Approve only if these allocations match your current priorities.'],
  disclaimer: 'AI can explain and suggest, but Loop uses the deterministic allocation plan as the source of truth.',
};

const forecastReviewFallback: AiReviewFallback = {
  summary: 'Loop reviewed this forecast against your income pattern, goals, debts, and rules.',
  positives: ['The forecast keeps deterministic numbers as the source of truth.'],
  risks: ['Forecasts can shift when income timing or debt obligations change.'],
  suggestedActions: ['Use this review as guidance, then adjust goals, debts, or rules directly in Loop.'],
  disclaimer: 'AI can explain and suggest, but Loop uses deterministic forecast calculations as the source of truth.',
};

function hashInviteToken(token: string) {
  return createHash('sha256').update(token.trim()).digest('hex');
}

function normalizedString(value: unknown, fallback = '') {
  return String(value || fallback).trim();
}

function normalizedNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function profileForRequest(request: { auth?: { uid: string; token?: Record<string, unknown> } | null }) {
  const token = request.auth?.token || {};

  return {
    displayName: normalizedString(token.name, normalizedString(token.email, 'Loop user')),
    email: normalizedString(token.email),
    photoURL: normalizedString(token.picture),
  };
}

function clampList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizeAiReview(value: unknown, fallback: AiReviewFallback): AiReview {
  const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const confidence = ['low', 'medium', 'high'].includes(String(input.confidence))
    ? String(input.confidence) as AiReview['confidence']
    : 'medium';

  return {
    summary: String(input.summary || fallback.summary).slice(0, 500),
    positives: clampList(input.positives, fallback.positives),
    risks: clampList(input.risks, fallback.risks),
    suggestedActions: clampList(input.suggestedActions, fallback.suggestedActions),
    confidence,
    disclaimer: String(input.disclaimer || fallback.disclaimer).slice(0, 300),
  };
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('DeepSeek did not return JSON.');
    return JSON.parse(match[0]);
  }
}

async function createDeepSeekReview(input: unknown, fallback: AiReviewFallback): Promise<AiReview> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'DeepSeek API key is not configured.');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: deepSeekModel,
      temperature: 0.2,
      max_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are Loop, a financial allocation assistant.',
            'Return only valid JSON with keys: summary, positives, risks, suggestedActions, confidence, disclaimer.',
            'positives, risks, and suggestedActions must be arrays of short plain-language strings.',
            'Use at most 3 items in each array, and keep every string under 140 characters.',
            'confidence must be low, medium, or high.',
            'Do not change any financial data or calculations. Explain and suggest only.',
            'Be clear, calm, practical, and bilingual when the locale is fr.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpsError('unavailable', `DeepSeek request failed with ${response.status}: ${body.slice(0, 240)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new HttpsError('internal', 'DeepSeek returned an empty response.');
  }

  return normalizeAiReview(parseJsonObject(content), fallback);
}

export const explainAllocation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { plan, context, locale } = request.data || {};

  if (!plan || !Array.isArray(plan.lines)) {
    throw new HttpsError('invalid-argument', 'An allocation plan with lines is required.');
  }

  return createDeepSeekReview(
    {
      task: 'allocation_review',
      locale: locale === 'fr' ? 'fr' : 'en',
      plan,
      context,
    },
    allocationReviewFallback,
  );
});

export const explainForecast = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { forecast, context, locale } = request.data || {};

  if (!forecast || !Array.isArray(forecast.scenarios)) {
    throw new HttpsError('invalid-argument', 'A financial forecast with scenarios is required.');
  }

  return createDeepSeekReview(
    {
      task: 'forecast_review',
      locale: locale === 'fr' ? 'fr' : 'en',
      forecast,
      context,
      instructions: [
        'Explain what the deterministic forecast means.',
        'Identify goal, debt, or income risks.',
        'Suggest practical next actions the user can take in Loop.',
        'Do not invent transactions, balances, or exact predictions not present in the input.',
      ],
    },
    forecastReviewFallback,
  );
});

export const createDebtSpaceInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const {
    title,
    counterpartyName,
    currency,
    principalAmount,
    currentBalance,
    minimumPayment,
    interestRate,
    firstPaymentDate,
    paymentFrequency,
    openingNote,
  } = request.data || {};
  const normalizedTitle = normalizedString(title, 'Shared debt');
  const normalizedCounterparty = normalizedString(counterpartyName, 'Shared member');
  const normalizedCurrency = normalizedString(currency, 'USD').slice(0, 6).toUpperCase();
  const normalizedPrincipal = Math.max(0, normalizedNumber(principalAmount));
  const normalizedBalance = Math.max(0, normalizedNumber(currentBalance, normalizedPrincipal));
  const normalizedMinimum = Math.max(0, normalizedNumber(minimumPayment));
  const normalizedInterest = Math.max(0, normalizedNumber(interestRate));

  if (!normalizedTitle || normalizedPrincipal <= 0) {
    throw new HttpsError('invalid-argument', 'A title and principal amount are required.');
  }

  const token = randomBytes(24).toString('base64url');
  const createdAt = new Date().toISOString();
  const spaceRef = db.collection('debtSpaces').doc();
  const memberProfiles = {
    [request.auth.uid]: {
      ...profileForRequest(request),
      role: 'creator',
      joinedAt: createdAt,
    },
  };

  await db.runTransaction(async (transaction) => {
    transaction.set(spaceRef, {
      title: normalizedTitle.slice(0, 120),
      counterpartyName: normalizedCounterparty.slice(0, 120),
      currency: normalizedCurrency,
      principalAmount: normalizedPrincipal,
      currentBalance: normalizedBalance,
      minimumPayment: normalizedMinimum,
      interestRate: normalizedInterest,
      firstPaymentDate: normalizedString(firstPaymentDate).slice(0, 20),
      paymentFrequency: ['weekly', 'monthly', 'yearly'].includes(String(paymentFrequency))
        ? String(paymentFrequency)
        : 'monthly',
      createdBy: request.auth!.uid,
      memberIds: [request.auth!.uid],
      memberProfiles,
      inviteTokenHash: hashInviteToken(token),
      inviteAcceptedBy: null,
      createdAt,
      updatedAt: createdAt,
    });

    const note = normalizedString(openingNote);
    if (note) {
      transaction.set(spaceRef.collection('entries').doc(), {
        type: 'note',
        authorId: request.auth!.uid,
        authorName: memberProfiles[request.auth!.uid].displayName,
        note: note.slice(0, 2000),
        amount: null,
        createdAt,
      });
    }
  });

  return {
    ok: true,
    spaceId: spaceRef.id,
    inviteToken: token,
  };
});

export const acceptDebtSpaceInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const { spaceId, inviteToken } = request.data || {};
  const normalizedSpaceId = normalizedString(spaceId);
  const normalizedToken = normalizedString(inviteToken);

  if (!normalizedSpaceId || !normalizedToken) {
    throw new HttpsError('invalid-argument', 'Space ID and invite token are required.');
  }

  const spaceRef = db.collection('debtSpaces').doc(normalizedSpaceId);
  const acceptedAt = new Date().toISOString();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(spaceRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Debt space not found.');
    }

    const data = snapshot.data() || {};
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds.map(String) : [];

    if (data.inviteTokenHash !== hashInviteToken(normalizedToken)) {
      throw new HttpsError('permission-denied', 'Invalid invite token.');
    }

    const profile = {
      ...profileForRequest(request),
      role: memberIds.length === 0 ? 'creator' : 'member',
      joinedAt: acceptedAt,
    };

    transaction.set(spaceRef, {
      memberIds: FieldValue.arrayUnion(request.auth!.uid),
      [`memberProfiles.${request.auth!.uid}`]: profile,
      inviteAcceptedBy: request.auth!.uid,
      updatedAt: acceptedAt,
    }, { merge: true });
  });

  return { ok: true };
});
