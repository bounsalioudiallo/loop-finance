import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
import type { AllocationPlan, Debt, FinancialForecast, FinancialRule, Goal, UserSettings } from '@/domain/finance';

export interface AiReview {
  summary: string;
  positives: string[];
  risks: string[];
  suggestedActions: string[];
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}

export interface FinanceAiContext {
  settings: UserSettings;
  goals: Goal[];
  debts: Debt[];
  rules: FinancialRule[];
}

const explainAllocationFunction = httpsCallable<
  {
    plan: AllocationPlan;
    context: FinanceAiContext;
    locale: string;
  },
  AiReview
>(functions, 'explainAllocation');

const explainForecastFunction = httpsCallable<
  {
    forecast: FinancialForecast;
    context: FinanceAiContext;
    locale: string;
  },
  AiReview
>(functions, 'explainForecast');

export async function explainAllocation(input: {
  plan: AllocationPlan;
  context: FinanceAiContext;
  locale: string;
}) {
  const response = await explainAllocationFunction(input);
  return response.data;
}

export async function explainForecast(input: {
  forecast: FinancialForecast;
  context: FinanceAiContext;
  locale: string;
}) {
  const response = await explainForecastFunction(input);
  return response.data;
}
