import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import type { Debt, DebtPaymentPlan } from '@/domain/finance';

const publishDebtShareFunction = httpsCallable(functions, 'publishDebtShare');
const getDebtShareFunction = httpsCallable(functions, 'getDebtShare');
const submitDebtShareActionFunction = httpsCallable(functions, 'submitDebtShareAction');

export function publishDebtShare(input: {
  shareId: string;
  accessCode: string;
  debt: Debt;
  paymentPlan: DebtPaymentPlan;
}) {
  return publishDebtShareFunction(input);
}

export function getProtectedDebtShare(input: { shareId: string; accessCode: string }) {
  return getDebtShareFunction(input);
}

export function submitProtectedDebtShareAction(input: {
  shareId: string;
  accessCode: string;
  lenderNote?: string;
  acknowledge?: boolean;
}) {
  return submitDebtShareActionFunction(input);
}
