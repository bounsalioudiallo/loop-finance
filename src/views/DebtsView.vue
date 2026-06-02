<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { CalendarClock, ListChecks, WalletCards } from '@lucide/vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { createDebtPaymentPlan, type Debt, type PaymentFrequency } from '@/domain/finance';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const router = useRouter();
const store = useFinanceStore();
const today = new Date().toISOString().slice(0, 10);

const form = reactive({
  lender: '',
  originalAmount: '1000',
  remainingAmount: '1000',
  minimumPayment: '100',
  interestRate: '0',
  firstPaymentDate: today,
  paymentFrequency: 'monthly' as PaymentFrequency,
});

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

function addDebt() {
  if (!form.lender.trim()) return;
  const [, , firstPaymentDay] = form.firstPaymentDate.split('-').map(Number);

  store.addDebt({
    lender: form.lender.trim(),
    originalAmount: Number(form.originalAmount) || 1,
    remainingAmount: Number(form.remainingAmount) || 0,
    minimumPayment: Number(form.minimumPayment) || 0,
    interestRate: Number(form.interestRate) || 0,
    dueDay: firstPaymentDay || 1,
    firstPaymentDate: form.firstPaymentDate,
    paymentFrequency: form.paymentFrequency,
  });

  form.lender = '';
}

function openSharePortal(debtId: string) {
  const share = store.createDebtShare(debtId);
  router.push(`/debt/share/${share.id}?preview=owner`);
}

function planFor(debt: Debt) {
  return createDebtPaymentPlan(debt, { maxRows: 3 });
}

function formatPlanDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value, { month: 'short', day: 'numeric' });
}
</script>

<template>
  <AppPageHeader :title="t('debts.title')" :subtitle="t('debts.subtitle')" />

  <section class="section-stack">
    <form class="form-panel debt-form-panel" @submit.prevent="addDebt">
      <div class="form-grid debt-form-grid">
        <label class="debt-form-full">
          <span>{{ t('debts.lender') }}</span>
          <input v-model="form.lender" placeholder="Family Loan" type="text" />
        </label>
        <label>
          <span>{{ t('debts.original') }}</span>
          <input v-model="form.originalAmount" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.remaining') }}</span>
          <input v-model="form.remainingAmount" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.minimum') }}</span>
          <input v-model="form.minimumPayment" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.interest') }}</span>
          <input v-model="form.interestRate" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.firstPaymentDate') }}</span>
          <input v-model="form.firstPaymentDate" type="date" />
        </label>
        <label>
          <span>{{ t('debts.paymentFrequency') }}</span>
          <select v-model="form.paymentFrequency">
            <option value="weekly">{{ t('debts.frequencies.weekly') }}</option>
            <option value="monthly">{{ t('debts.frequencies.monthly') }}</option>
            <option value="yearly">{{ t('debts.frequencies.yearly') }}</option>
          </select>
        </label>
      </div>
      <div class="actions" style="margin-top: 18px">
        <button class="primary-button" type="submit">{{ t('debts.add') }}</button>
      </div>
    </form>

    <article class="panel">
      <h2>{{ t('debts.active') }}</h2>
      <div class="data-list">
        <div v-for="debt in store.state.debts" :key="debt.id" class="data-row">
          <div class="row-main">
            <div>
              <strong>{{ debt.lender }}</strong>
              <small>
                {{ money.format(debt.remainingAmount) }} {{ t('debts.left') }}
                · {{ money.format(debt.minimumPayment) }} {{ t('debts.minimumShort') }}
              </small>
            </div>
            <button class="danger-button" type="button" @click="store.removeDebt(debt.id)">
              {{ t('actions.delete') }}
            </button>
          </div>
          <div class="progress">
            <span :style="{ display: 'block', width: `${Math.min(100, (1 - debt.remainingAmount / debt.originalAmount) * 100)}%` }" />
          </div>

          <section class="debt-plan-workshop">
            <div class="debt-plan-heading">
              <div>
                <span>{{ t('debts.planWorkshop') }}</span>
                <strong>{{ t('debts.repaymentPlan') }}</strong>
              </div>
              <small>{{ planFor(debt).monthsToPayoff }} {{ t('debts.installments') }}</small>
            </div>

            <div class="debt-plan-metrics">
              <div>
                <WalletCards :size="17" />
                <span>{{ t('debts.planPayment') }}</span>
                <strong>{{ money.format(planFor(debt).paymentAmount) }}</strong>
              </div>
              <div>
                <CalendarClock :size="17" />
                <span>{{ t('debts.planFrequency') }}</span>
                <strong>{{ t(`debts.frequencies.${debt.paymentFrequency || 'monthly'}`) }}</strong>
              </div>
            </div>

            <div class="debt-plan-list">
              <div v-for="row in planFor(debt).rows" :key="`${debt.id}-${row.month}`" class="debt-plan-row">
                <ListChecks :size="17" />
                <span>{{ formatPlanDate(row.dueDate) }}</span>
                <strong>{{ money.format(row.amount) }}</strong>
                <small>{{ money.format(row.balanceAfter) }} {{ t('debts.left') }}</small>
              </div>
            </div>
          </section>

          <div class="actions">
            <button class="secondary-button" type="button" @click="openSharePortal(debt.id)">
              {{ t('debts.share') }}
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
