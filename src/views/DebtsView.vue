<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const store = useFinanceStore();

const form = reactive({
  lender: '',
  originalAmount: '1000',
  remainingAmount: '1000',
  minimumPayment: '100',
  interestRate: '0',
  dueDay: '18',
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

  store.addDebt({
    lender: form.lender.trim(),
    originalAmount: Number(form.originalAmount) || 1,
    remainingAmount: Number(form.remainingAmount) || 0,
    minimumPayment: Number(form.minimumPayment) || 0,
    interestRate: Number(form.interestRate) || 0,
    dueDay: Number(form.dueDay) || 1,
  });

  form.lender = '';
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('debts.title') }}</h1>
    <p>{{ t('debts.subtitle') }}</p>
  </section>

  <section class="section-stack">
    <form class="form-panel" @submit.prevent="addDebt">
      <div class="form-grid">
        <label>
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
          <span>{{ t('debts.dueDay') }}</span>
          <input v-model="form.dueDay" inputmode="numeric" type="text" />
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
        </div>
      </div>
    </article>
  </section>
</template>
