import { computed, reactive, watch } from 'vue';
import {
  createAllocationPlan,
  type AllocationLine,
  type AllocationMode,
  type Debt,
  type FinancialRule,
  type Goal,
  type IncomeEvent,
  type IncomeProfile,
  type UserSettings,
} from '@/domain/finance';

interface FinanceState {
  settings: UserSettings;
  goals: Goal[];
  debts: Debt[];
  rules: FinancialRule[];
  incomeEvents: IncomeEvent[];
  allocations: AllocationLine[];
}

const storageKey = 'loop-finance-state-v1';

const defaultState: FinanceState = {
  settings: {
    incomeProfile: 'monthly',
    allocationMode: 'balanced',
    language: 'en',
    currency: 'USD',
    isOnboarded: false,
  },
  goals: [
    {
      id: 'goal-emergency',
      name: 'Emergency Fund',
      currentAmount: 1200,
      targetAmount: 5000,
      priority: 3,
    },
    {
      id: 'goal-business',
      name: 'Business Fund',
      currentAmount: 450,
      targetAmount: 3000,
      priority: 2,
    },
    {
      id: 'goal-savings',
      name: 'Savings',
      currentAmount: 200,
      targetAmount: 2500,
      priority: 2,
    },
  ],
  debts: [
    {
      id: 'debt-family-loan',
      lender: 'Family Loan',
      originalAmount: 2200,
      remainingAmount: 800,
      minimumPayment: 150,
      interestRate: 0,
      dueDay: 18,
    },
  ],
  rules: [
    {
      id: 'rule-family',
      label: 'Always send $100 home first.',
      category: 'Family Support',
      type: 'fixed',
      value: 100,
    },
    {
      id: 'rule-savings',
      label: 'At least 10% goes to savings.',
      category: 'Savings Floor',
      type: 'minimumPercent',
      value: 10,
    },
  ],
  incomeEvents: [],
  allocations: [],
};

function cloneState(value: FinanceState): FinanceState {
  return JSON.parse(JSON.stringify(value)) as FinanceState;
}

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) return cloneState(defaultState);

  return {
    ...cloneState(defaultState),
    ...JSON.parse(saved),
  } as FinanceState;
}

const state = reactive<FinanceState>(loadState());

watch(
  state,
  (nextState) => {
    localStorage.setItem(storageKey, JSON.stringify(nextState));
  },
  { deep: true },
);

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function useFinanceStore() {
  const incomeThisMonth = computed(() =>
    state.incomeEvents.reduce((total, income) => total + income.amount, 0),
  );

  const allocated = computed(() =>
    state.allocations.reduce((total, allocation) => total + allocation.amount, 0),
  );

  const healthScore = computed(() => {
    const goalProgress =
      state.goals.reduce((total, goal) => total + goal.currentAmount / goal.targetAmount, 0) /
      Math.max(state.goals.length, 1);
    const debtProgress =
      state.debts.reduce(
        (total, debt) => total + (1 - debt.remainingAmount / debt.originalAmount),
        0,
      ) / Math.max(state.debts.length, 1);

    return Math.round(Math.min(100, 45 + goalProgress * 35 + debtProgress * 20));
  });

  function saveSettings(settings: Partial<UserSettings>) {
    Object.assign(state.settings, settings, { isOnboarded: true });
  }

  function addGoal(goal: Omit<Goal, 'id'>) {
    state.goals.push({ ...goal, id: id('goal') });
  }

  function addDebt(debt: Omit<Debt, 'id'>) {
    state.debts.push({ ...debt, id: id('debt') });
  }

  function addRule(rule: Omit<FinancialRule, 'id'>) {
    state.rules.push({ ...rule, id: id('rule') });
  }

  function removeGoal(goalId: string) {
    state.goals = state.goals.filter((goal) => goal.id !== goalId);
  }

  function removeDebt(debtId: string) {
    state.debts = state.debts.filter((debt) => debt.id !== debtId);
  }

  function removeRule(ruleId: string) {
    state.rules = state.rules.filter((rule) => rule.id !== ruleId);
  }

  function addIncomeEvent(input: { amount: number; source: string; profile: IncomeProfile }) {
    const income: IncomeEvent = {
      id: id('income'),
      amount: input.amount,
      source: input.source,
      profile: input.profile,
      receivedAt: new Date().toISOString(),
      allocated: false,
    };

    state.incomeEvents.unshift(income);
    return income;
  }

  function getIncomeEvent(incomeId: string) {
    return state.incomeEvents.find((income) => income.id === incomeId);
  }

  function previewAllocation(incomeId: string) {
    const income = getIncomeEvent(incomeId);
    if (!income) return null;

    return createAllocationPlan(
      income,
      state.goals,
      state.debts,
      state.rules,
      state.settings.allocationMode as AllocationMode,
    );
  }

  function approveAllocation(incomeId: string) {
    const plan = previewAllocation(incomeId);
    const income = getIncomeEvent(incomeId);

    if (!plan || !income) return null;
    if (income.allocated) return plan;

    for (const line of plan.lines) {
      const goal = state.goals.find((item) => line.label === item.name);
      const debt = state.debts.find((item) => line.label.startsWith(item.lender));

      if (goal) goal.currentAmount = Math.min(goal.targetAmount, goal.currentAmount + line.amount);
      if (debt) debt.remainingAmount = Math.max(0, debt.remainingAmount - line.amount);
    }

    income.allocated = true;
    state.allocations.unshift(...plan.lines);
    return plan;
  }

  return {
    state,
    incomeThisMonth,
    allocated,
    healthScore,
    saveSettings,
    addGoal,
    addDebt,
    addRule,
    removeGoal,
    removeDebt,
    removeRule,
    addIncomeEvent,
    getIncomeEvent,
    previewAllocation,
    approveAllocation,
  };
}
