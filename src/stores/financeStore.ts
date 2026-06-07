import { computed, reactive, watch } from 'vue';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  createAllocationPlan,
  createFinancialForecast,
  type AllocationLine,
  type AllocationMode,
  type Debt,
  type FinancialRule,
  type Goal,
  type IncomeEvent,
  type IncomeProfile,
  type UserSettings,
} from '@/domain/finance';
import { auth, db } from '@/services/firebase';

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
  goals: [],
  debts: [],
  rules: [],
  incomeEvents: [],
  allocations: [],
};

const demoGoalIds = new Set(['goal-emergency', 'goal-business', 'goal-savings']);
const demoDebtIds = new Set(['debt-family-loan']);
const demoRuleIds = new Set(['rule-family', 'rule-savings']);
const demoAllocationLabels = new Set([
  'Emergency Fund',
  'Business Fund',
  'Savings',
  'Family Loan minimum',
  'Family Loan extra',
  'Family Support',
  'Savings Floor',
]);

function cloneState(value: FinanceState): FinanceState {
  return JSON.parse(JSON.stringify(value)) as FinanceState;
}

function normalizeState(input: Partial<FinanceState>) {
  return {
    ...cloneState(defaultState),
    ...input,
    goals: input.goals || [],
    debts: input.debts || [],
    rules: input.rules || [],
    incomeEvents: input.incomeEvents || [],
    allocations: input.allocations || [],
    settings: {
      ...cloneState(defaultState).settings,
      ...input.settings,
    },
  } as FinanceState;
}

function removeDemoSeedData(input: FinanceState) {
  const stateWithoutDemo = {
    ...input,
    goals: input.goals.filter((goal) => !demoGoalIds.has(goal.id)),
    debts: input.debts.filter((debt) => !demoDebtIds.has(debt.id)),
    rules: input.rules.filter((rule) => !demoRuleIds.has(rule.id)),
    allocations: input.allocations.filter((line) => {
      if (demoAllocationLabels.has(line.label)) return false;
      if (line.id.includes('goal-emergency')) return false;
      if (line.id.includes('goal-business')) return false;
      if (line.id.includes('goal-savings')) return false;
      if (line.id.includes('debt-family-loan')) return false;
      if (line.id.includes('rule-family')) return false;
      if (line.id.includes('rule-savings')) return false;
      return true;
    }),
  };
  const migrated = JSON.stringify(stateWithoutDemo) !== JSON.stringify(input);

  return { state: stateWithoutDemo, migrated };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);

  if (!saved) return cloneState(defaultState);

  const parsed = JSON.parse(saved) as Partial<FinanceState>;
  const { state: nextState, migrated } = removeDemoSeedData(normalizeState(parsed));

  if (migrated) {
    localStorage.setItem(storageKey, JSON.stringify(nextState));
  }

  return nextState;
}

const state = reactive<FinanceState>(loadState());
let activeUser: User | null = null;
let isHydratingFromFirestore = false;
let saveTimer: number | undefined;

function financeDoc(userId: string) {
  return doc(db, 'users', userId, 'private', 'finance');
}

async function saveStateToFirestore(user: User) {
  await setDoc(
    financeDoc(user.uid),
    {
      ...JSON.parse(JSON.stringify(state)),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

async function hydrateStateFromFirestore(user: User) {
  const snapshot = await getDoc(financeDoc(user.uid));

  if (!snapshot.exists()) {
    await saveStateToFirestore(user);
    return;
  }

  const data = snapshot.data() as Partial<FinanceState>;
  const { state: nextState, migrated } = removeDemoSeedData(normalizeState(data));
  isHydratingFromFirestore = true;

  Object.assign(state, nextState);
  localStorage.setItem(storageKey, JSON.stringify(nextState));

  window.setTimeout(() => {
    isHydratingFromFirestore = false;
    if (migrated) {
      void saveStateToFirestore(user);
    }
  });
}

watch(
  state,
  (nextState) => {
    localStorage.setItem(storageKey, JSON.stringify(nextState));

    if (!activeUser || isHydratingFromFirestore) return;

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void saveStateToFirestore(activeUser!);
    }, 500);
  },
  { deep: true },
);

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

onAuthStateChanged(auth, (user) => {
  activeUser = user;
  if (!user) return;

  void hydrateStateFromFirestore(user);
});

export function useFinanceStore() {
  const incomeThisMonth = computed(() =>
    state.incomeEvents.reduce((total, income) => total + income.amount, 0),
  );

  const allocated = computed(() =>
    state.allocations.reduce((total, allocation) => total + allocation.amount, 0),
  );

  const healthScore = computed(() => {
    if (state.goals.length === 0 && state.debts.length === 0) return null;

    const goalProgress =
      state.goals.reduce((total, goal) => total + goal.currentAmount / Math.max(goal.targetAmount, 1), 0) /
      Math.max(state.goals.length, 1);
    const debtProgress =
      state.debts.reduce(
        (total, debt) => total + (1 - debt.remainingAmount / Math.max(debt.originalAmount, 1)),
        0,
      ) / Math.max(state.debts.length, 1);

    return Math.round(Math.min(100, 45 + goalProgress * 35 + debtProgress * 20));
  });

  const forecast = computed(() =>
    createFinancialForecast(
      state.settings,
      state.goals,
      state.debts,
      state.rules,
      state.incomeEvents,
    ),
  );

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

  function getDebt(debtId: string) {
    return state.debts.find((debt) => debt.id === debtId);
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
    forecast,
    saveSettings,
    addGoal,
    addDebt,
    addRule,
    removeGoal,
    removeDebt,
    removeRule,
    addIncomeEvent,
    getDebt,
    getIncomeEvent,
    previewAllocation,
    approveAllocation,
  };
}
