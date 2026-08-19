export type NotebookDirection = 'theyOweMe' | 'iOweThem' | 'iPaidThem' | 'theyPaidMe' | 'neutral';
export type NotebookConfidence = 'low' | 'medium' | 'high';
export type NotebookAgeTone = 'fresh' | 'settling' | 'old' | 'stale';

export interface NotebookInterpretation {
  amount: number | null;
  amountText: string;
  currencyCue: string;
  reasonCue: string;
  direction: NotebookDirection;
  confidence: NotebookConfidence;
}

const amountPattern = /(?:\d{1,3}(?:[ ,.\u00a0]\d{3})+|\d+(?:[.,]\d{1,2})?)/;
const currencyWords = new Set([
  'fcfa', 'cfa', 'xaf',
  'usd', 'dollar', 'dollars', '$',
  'eur', 'euro', 'euros',
  'gbp', 'pound', 'pounds', '£',
]);
const currencyAliases: Record<string, string> = {
  fcfa: 'XAF',
  cfa: 'XAF',
  xaf: 'XAF',
  usd: 'USD',
  dollar: 'USD',
  dollars: 'USD',
  '$': 'USD',
  eur: 'EUR',
  euro: 'EUR',
  euros: 'EUR',
  gbp: 'GBP',
  pound: 'GBP',
  pounds: 'GBP',
  '£': 'GBP',
};
const fillerWords = new Set([
  'for',
  'because',
  'bc',
  'to',
  'on',
  'of',
  'the',
  'a',
  'an',
  'him',
  'her',
  'them',
  'me',
  'my',
]);

function normalizeAmount(text: string) {
  const compact = text.replace(/[\s\u00a0]/g, '');
  const hasDecimalComma = /,\d{1,2}$/.test(compact);
  const normalized = compact
    .replace(hasDecimalComma ? /\./g : /,/g, '')
    .replace(hasDecimalComma ? ',' : /,(?=\d{3}\b)/g, '.');
  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

function wordTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function detectDirection(text: string): { direction: NotebookDirection; confidence: NotebookConfidence } {
  const normalized = ` ${text.toLowerCase()} `;

  if (/\b(he|she|they|you|boubacar|friend)\s+paid\b/.test(normalized) || /\bpaid\s+me\b/.test(normalized) || /\breceived\b/.test(normalized)) {
    return { direction: 'theyPaidMe', confidence: 'high' };
  }

  if (/\b(i\s+)?paid\b/.test(normalized) || /\bsent\b/.test(normalized) || /\breimbursed\b/.test(normalized)) {
    return { direction: 'iPaidThem', confidence: 'high' };
  }

  if (/\bborrowed\b/.test(normalized) || /\btook\b/.test(normalized) || /\bi\s+owe\b/.test(normalized) || /\bo?we\s+(him|her|them)\b/.test(normalized)) {
    return { direction: 'iOweThem', confidence: 'high' };
  }

  if (/\blent\b/.test(normalized) || /\blend\b/.test(normalized) || /\bgave\b/.test(normalized) || /\bfronted\b/.test(normalized) || /\badvanced\b/.test(normalized)) {
    return { direction: 'theyOweMe', confidence: 'high' };
  }

  if (/\bsettled\b/.test(normalized) || /\bdone\b/.test(normalized) || /\bclear\b/.test(normalized)) {
    return { direction: 'neutral', confidence: 'medium' };
  }

  return { direction: 'theyOweMe', confidence: 'medium' };
}

function detectCurrency(tokens: string[]) {
  return tokens.find((token) => currencyWords.has(token)) || '';
}

function detectReason(textAfterAmount: string) {
  const tokens = wordTokens(textAfterAmount)
    .filter((token) => !currencyWords.has(token))
    .filter((token) => !fillerWords.has(token));

  return tokens.slice(0, 3).join(' ');
}

export function parseNotebookNote(note: string): NotebookInterpretation {
  const amountMatch = note.match(amountPattern);
  const amountText = amountMatch?.[0] || '';
  const amount = amountText ? normalizeAmount(amountText) : null;
  const tokens = wordTokens(note);
  const currencyCue = detectCurrency(tokens);
  const reasonCue = amountMatch ? detectReason(note.slice((amountMatch.index || 0) + amountText.length)) : '';
  const directionResult = detectDirection(note);
  const confidence: NotebookConfidence = amount
    ? reasonCue || directionResult.confidence === 'high'
      ? directionResult.confidence
      : 'medium'
    : 'low';

  return {
    amount,
    amountText,
    currencyCue,
    reasonCue,
    direction: amount ? directionResult.direction : 'neutral',
    confidence,
  };
}

export function currencyFromCue(currencyCue: string, fallbackCurrency: string) {
  return currencyAliases[currencyCue.trim().toLowerCase()] || fallbackCurrency;
}

export function directionImpact(direction: NotebookDirection, amount: number) {
  const normalizedAmount = Math.max(0, amount);

  if (direction === 'theyOweMe' || direction === 'iPaidThem') return normalizedAmount;
  if (direction === 'iOweThem' || direction === 'theyPaidMe') return -normalizedAmount;
  return 0;
}

export function ageTone(createdAt: string, isOpen = true): NotebookAgeTone {
  if (!isOpen) return 'fresh';

  const ageInDays = (Date.now() - new Date(createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays >= 90) return 'stale';
  if (ageInDays >= 45) return 'old';
  if (ageInDays >= 14) return 'settling';
  return 'fresh';
}

export function ageLabel(createdAt: string) {
  const ageInDays = Math.max(0, Math.floor((Date.now() - new Date(createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)));

  if (ageInDays === 0) return 'today';
  if (ageInDays < 30) return `${ageInDays}d`;

  const months = Math.floor(ageInDays / 30);
  return `${months}mo`;
}
