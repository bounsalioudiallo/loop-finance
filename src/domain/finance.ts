export type IncomeProfile = 'monthly' | 'biweekly' | 'weekly' | 'project' | 'mixed';
export type AllocationMode = 'balanced' | 'aggressive' | 'stability' | 'family';
export type RuleType = 'fixed' | 'minimumPercent' | 'maximumPercent';
export type PaymentFrequency = 'weekly' | 'monthly' | 'yearly';

export interface UserSettings {
  incomeProfile: IncomeProfile;
  allocationMode: AllocationMode;
  language: 'en' | 'fr';
  currency: string;
  isOnboarded: boolean;
}

export interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  priority: number;
}

export interface Debt {
  id: string;
  lender: string;
  originalAmount: number;
  remainingAmount: number;
  minimumPayment: number;
  interestRate: number;
  dueDay: number;
  firstPaymentDate?: string;
  paymentFrequency?: PaymentFrequency;
}

export interface FinancialRule {
  id: string;
  label: string;
  category: string;
  type: RuleType;
  value: number;
}

export interface IncomeEvent {
  id: string;
  amount: number;
  source: string;
  profile: IncomeProfile;
  receivedAt: string;
  allocated: boolean;
}

export interface AllocationLine {
  id: string;
  label: string;
  kind: 'rule' | 'debt' | 'goal' | 'free';
  amount: number;
  explanation: string;
}

export interface AllocationPlan {
  incomeId: string;
  incomeAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  lines: AllocationLine[];
  notes: string[];
}

export interface ForecastScenario {
  id: 'conservative' | 'expected' | 'optimistic';
  monthlyIncome: number;
  monthlyAfterDebtMinimums: number;
}

export interface GoalForecast {
  goalId: string;
  name: string;
  remainingAmount: number;
  monthlyContribution: number;
  monthsToComplete: number | null;
}

export interface DebtForecast {
  debtId: string;
  lender: string;
  remainingAmount: number;
  minimumPayment: number;
  monthsToPayoff: number | null;
}

export interface ForecastAlert {
  id: string;
  level: 'good' | 'warning' | 'risk';
  titleKey: string;
  bodyKey: string;
}

export interface FinancialForecast {
  expectedMonthlyIncome: number;
  scenarios: ForecastScenario[];
  goalForecasts: GoalForecast[];
  debtForecasts: DebtForecast[];
  alerts: ForecastAlert[];
}

export interface DebtPaymentPlanRow {
  month: number;
  dueDate: string;
  amount: number;
  balanceAfter: number;
  isFinalPayment: boolean;
}

export interface DebtPaymentPlan {
  debtId: string;
  paymentAmount: number;
  monthsToPayoff: number;
  totalPaid: number;
  rows: DebtPaymentPlanRow[];
}

const modeWeights: Record<AllocationMode, Record<string, number>> = {
  balanced: {
    emergency: 25,
    debt: 25,
    savings: 20,
    business: 15,
    family: 10,
    free: 5,
  },
  aggressive: {
    emergency: 15,
    debt: 35,
    savings: 25,
    business: 20,
    family: 0,
    free: 5,
  },
  stability: {
    emergency: 40,
    debt: 20,
    savings: 20,
    business: 10,
    family: 0,
    free: 10,
  },
  family: {
    emergency: 25,
    debt: 20,
    savings: 15,
    business: 0,
    family: 30,
    free: 10,
  },
};

function goalBucket(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes('emergency')) return 'emergency';
  if (normalized.includes('business') || normalized.includes('shop')) return 'business';
  if (normalized.includes('family') || normalized.includes('home')) return 'family';
  if (normalized.includes('fun') || normalized.includes('spending')) return 'free';

  return 'savings';
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

function profileMultiplier(profile: IncomeProfile) {
  const multipliers: Record<IncomeProfile, number> = {
    monthly: 1,
    biweekly: 2.17,
    weekly: 4.33,
    project: 1,
    mixed: 1.5,
  };

  return multipliers[profile];
}

function expectedMonthlyIncome(events: IncomeEvent[], profile: IncomeProfile) {
  if (events.length === 0) return 0;

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  const latestEvent = sortedEvents[0];
  const recentEvents = sortedEvents.filter((event) => {
    const ageInDays =
      (new Date(latestEvent.receivedAt).getTime() - new Date(event.receivedAt).getTime()) /
      (1000 * 60 * 60 * 24);

    return ageInDays <= 90;
  });

  if (recentEvents.length === 1) {
    return roundMoney(recentEvents[0].amount * profileMultiplier(profile));
  }

  const firstDate = new Date(recentEvents[recentEvents.length - 1].receivedAt).getTime();
  const lastDate = new Date(recentEvents[0].receivedAt).getTime();
  const months = Math.max((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30), 1);
  const total = recentEvents.reduce((sum, event) => sum + event.amount, 0);

  return roundMoney(total / months);
}

function nextDueDate(startDate: Date, dueDay: number) {
  const normalizedDueDay = Math.min(Math.max(dueDay, 1), 28);
  const candidate = new Date(startDate.getFullYear(), startDate.getMonth(), normalizedDueDay);

  if (candidate.getTime() <= startDate.getTime()) {
    candidate.setMonth(candidate.getMonth() + 1);
  }

  return candidate;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return new Date(value);

  return new Date(year, month - 1, day);
}

function planStartDate(debt: Debt, startDate?: string) {
  if (debt.firstPaymentDate) return parseLocalDate(debt.firstPaymentDate);
  if (startDate) return nextDueDate(new Date(startDate), debt.dueDay);

  return nextDueDate(new Date(), debt.dueDay);
}

function addPaymentInterval(date: Date, intervals: number, frequency: PaymentFrequency) {
  if (frequency === 'weekly') {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + intervals * 7);
  }

  if (frequency === 'yearly') {
    return new Date(date.getFullYear() + intervals, date.getMonth(), date.getDate());
  }

  return new Date(date.getFullYear(), date.getMonth() + intervals, date.getDate());
}

export function createDebtPaymentPlan(
  debt: Debt,
  options: { startDate?: string; maxRows?: number } = {},
): DebtPaymentPlan {
  const paymentAmount = roundMoney(Math.max(0, Math.min(debt.minimumPayment, debt.remainingAmount)));
  const rows: DebtPaymentPlanRow[] = [];

  if (debt.remainingAmount <= 0 || paymentAmount <= 0) {
    return {
      debtId: debt.id,
      paymentAmount,
      monthsToPayoff: 0,
      totalPaid: 0,
      rows,
    };
  }

  const monthsToPayoff = Math.ceil(debt.remainingAmount / paymentAmount);
  const maxRows = Math.min(options.maxRows ?? monthsToPayoff, monthsToPayoff);
  const firstDueDate = planStartDate(debt, options.startDate);
  const paymentFrequency = debt.paymentFrequency || 'monthly';
  let balance = debt.remainingAmount;
  let totalPaid = 0;

  for (let index = 0; index < maxRows; index += 1) {
    const amount = roundMoney(Math.min(paymentAmount, balance));
    balance = roundMoney(Math.max(0, balance - amount));
    totalPaid = roundMoney(totalPaid + amount);

    rows.push({
      month: index + 1,
      dueDate: addPaymentInterval(firstDueDate, index, paymentFrequency).toISOString(),
      amount,
      balanceAfter: balance,
      isFinalPayment: balance === 0,
    });
  }

  return {
    debtId: debt.id,
    paymentAmount,
    monthsToPayoff,
    totalPaid,
    rows,
  };
}

export function createAllocationPlan(
  income: IncomeEvent,
  goals: Goal[],
  debts: Debt[],
  rules: FinancialRule[],
  mode: AllocationMode,
): AllocationPlan {
  const notes: string[] = [];
  const lines: AllocationLine[] = [];
  const activeGoals = goals.filter((goal) => goal.currentAmount < goal.targetAmount);
  let remaining = income.amount;

  for (const rule of rules) {
    if (remaining <= 0) break;

    if (rule.type === 'maximumPercent') continue;

    const rawAmount = rule.type === 'fixed' ? rule.value : income.amount * (rule.value / 100);
    const amount = roundMoney(Math.min(rawAmount, remaining));

    if (amount > 0) {
      lines.push({
        id: `rule-${rule.id}`,
        label: rule.category,
        kind: 'rule',
        amount,
        explanation: rule.label,
      });
      remaining = roundMoney(remaining - amount);
    }
  }

  for (const debt of debts.filter((item) => item.remainingAmount > 0)) {
    if (remaining <= 0) break;

    const amount = roundMoney(Math.min(debt.minimumPayment, debt.remainingAmount, remaining));

    if (amount > 0) {
      lines.push({
        id: `debt-min-${debt.id}`,
        label: `${debt.lender} minimum`,
        kind: 'debt',
        amount,
        explanation: 'Minimum debt obligation is reserved before weighted goals.',
      });
      remaining = roundMoney(remaining - amount);
    }
  }

  const weightedItems = [
    ...activeGoals.map((goal) => ({
      id: goal.id,
      label: goal.name,
      kind: 'goal' as const,
      cap: goal.targetAmount - goal.currentAmount,
      weight: (modeWeights[mode][goalBucket(goal.name)] || 10) * goal.priority,
    })),
    ...debts
      .filter((debt) => debt.remainingAmount > debt.minimumPayment)
      .map((debt) => ({
        id: debt.id,
        label: `${debt.lender} extra`,
        kind: 'debt' as const,
        cap: debt.remainingAmount - debt.minimumPayment,
        weight: modeWeights[mode].debt,
      })),
    {
      id: 'free-spending',
      label: 'Free Spending',
      kind: 'free' as const,
      cap: Number.POSITIVE_INFINITY,
      weight: modeWeights[mode].free,
    },
  ].filter((item) => item.weight > 0 && item.cap > 0);

  let allocationPool = remaining;
  let openItems = [...weightedItems];

  while (allocationPool > 0.01 && openItems.length > 0) {
    const totalWeight = openItems.reduce((total, item) => total + item.weight, 0);
    const nextOpenItems = [];
    let distributed = 0;

    for (const item of openItems) {
      const rawShare = allocationPool * (item.weight / totalWeight);
      const existingLine = lines.find((line) => line.id === `weighted-${item.kind}-${item.id}`);
      const alreadyAllocated = existingLine?.amount || 0;
      const room = item.cap - alreadyAllocated;
      const amount = roundMoney(Math.min(rawShare, room));

      if (amount > 0) {
        if (existingLine) {
          existingLine.amount = roundMoney(existingLine.amount + amount);
        } else {
          lines.push({
            id: `weighted-${item.kind}-${item.id}`,
            label: item.label,
            kind: item.kind,
            amount,
            explanation: 'Weighted allocation after rules and required debt payments.',
          });
        }
        distributed = roundMoney(distributed + amount);
      }

      if (room - amount > 0.01) {
        nextOpenItems.push(item);
      }
    }

    if (distributed <= 0) break;

    allocationPool = roundMoney(allocationPool - distributed);
    openItems = nextOpenItems;
  }

  if (allocationPool > 0.01) {
    notes.push(`${roundMoney(allocationPool)} was left unassigned because active categories were capped.`);
  }

  let allocatedAmount = roundMoney(lines.reduce((total, line) => total + line.amount, 0));

  if (allocatedAmount > income.amount && lines.length > 0) {
    const overage = roundMoney(allocatedAmount - income.amount);
    const lastLine = lines[lines.length - 1];
    lastLine.amount = roundMoney(Math.max(0, lastLine.amount - overage));
    allocatedAmount = roundMoney(lines.reduce((total, line) => total + line.amount, 0));
  }

  return {
    incomeId: income.id,
    incomeAmount: income.amount,
    allocatedAmount,
    remainingAmount: roundMoney(income.amount - allocatedAmount),
    lines,
    notes,
  };
}

export function createFinancialForecast(
  settings: UserSettings,
  goals: Goal[],
  debts: Debt[],
  rules: FinancialRule[],
  incomeEvents: IncomeEvent[],
): FinancialForecast {
  const expectedIncome = expectedMonthlyIncome(incomeEvents, settings.incomeProfile);
  const debtMinimums = debts.reduce(
    (sum, debt) => sum + Math.min(debt.minimumPayment, debt.remainingAmount),
    0,
  );
  const scenarioInputs = [
    { id: 'conservative' as const, factor: 0.8 },
    { id: 'expected' as const, factor: 1 },
    { id: 'optimistic' as const, factor: 1.25 },
  ];
  const scenarios = scenarioInputs.map(({ id, factor }) => {
    const monthlyIncome = roundMoney(expectedIncome * factor);

    return {
      id,
      monthlyIncome,
      monthlyAfterDebtMinimums: roundMoney(Math.max(0, monthlyIncome - debtMinimums)),
    };
  });
  const syntheticIncome: IncomeEvent = {
    id: 'forecast-income',
    amount: expectedIncome,
    source: 'Forecast',
    profile: settings.incomeProfile,
    receivedAt: new Date().toISOString(),
    allocated: false,
  };
  const allocationPlan =
    expectedIncome > 0
      ? createAllocationPlan(
          syntheticIncome,
          goals,
          debts,
          rules,
          settings.allocationMode as AllocationMode,
        )
      : null;

  const goalForecasts = goals
    .filter((goal) => goal.currentAmount < goal.targetAmount)
    .map((goal) => {
      const monthlyContribution =
        allocationPlan?.lines.find((line) => line.kind === 'goal' && line.label === goal.name)?.amount || 0;
      const remainingAmount = roundMoney(goal.targetAmount - goal.currentAmount);

      return {
        goalId: goal.id,
        name: goal.name,
        remainingAmount,
        monthlyContribution,
        monthsToComplete:
          monthlyContribution > 0 ? Math.ceil(remainingAmount / monthlyContribution) : null,
      };
    });

  const debtForecasts = debts
    .filter((debt) => debt.remainingAmount > 0)
    .map((debt) => ({
      debtId: debt.id,
      lender: debt.lender,
      remainingAmount: debt.remainingAmount,
      minimumPayment: debt.minimumPayment,
      monthsToPayoff:
        debt.minimumPayment > 0 ? Math.ceil(debt.remainingAmount / debt.minimumPayment) : null,
    }));

  const alerts: ForecastAlert[] = [];
  const debtLoad = expectedIncome > 0 ? debtMinimums / expectedIncome : 0;

  if (expectedIncome === 0) {
    alerts.push({
      id: 'income-data',
      level: 'warning',
      titleKey: 'forecast.alerts.noIncomeTitle',
      bodyKey: 'forecast.alerts.noIncomeBody',
    });
  } else if (debtLoad > 0.35) {
    alerts.push({
      id: 'debt-pressure',
      level: 'risk',
      titleKey: 'forecast.alerts.debtPressureTitle',
      bodyKey: 'forecast.alerts.debtPressureBody',
    });
  } else {
    alerts.push({
      id: 'income-ready',
      level: 'good',
      titleKey: 'forecast.alerts.incomeReadyTitle',
      bodyKey: 'forecast.alerts.incomeReadyBody',
    });
  }

  if (goalForecasts.some((goal) => goal.monthlyContribution <= 0)) {
    alerts.push({
      id: 'goal-stall',
      level: 'warning',
      titleKey: 'forecast.alerts.goalStallTitle',
      bodyKey: 'forecast.alerts.goalStallBody',
    });
  }

  return {
    expectedMonthlyIncome: expectedIncome,
    scenarios,
    goalForecasts,
    debtForecasts,
    alerts,
  };
}
