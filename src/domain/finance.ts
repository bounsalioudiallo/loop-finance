export type IncomeProfile = 'monthly' | 'biweekly' | 'weekly' | 'project' | 'mixed';
export type AllocationMode = 'balanced' | 'aggressive' | 'stability' | 'family';
export type RuleType = 'fixed' | 'minimumPercent' | 'maximumPercent';

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
