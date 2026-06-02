<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const store = useFinanceStore();

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

const remaining = computed(() => store.incomeThisMonth.value - store.allocated.value);

const metrics = computed(() => [
  { label: t('dashboard.incomeThisMonth'), value: money.value.format(store.incomeThisMonth.value) },
  { label: t('dashboard.allocated'), value: money.value.format(store.allocated.value) },
  { label: t('dashboard.remaining'), value: money.value.format(remaining.value) },
  { label: t('dashboard.healthScore'), value: `${store.healthScore.value} / 100` },
]);

const upcoming = computed(() => {
  const nextDebt = store.state.debts.find((debt) => debt.remainingAmount > 0);
  return [
    t('dashboard.nextIncome'),
    nextDebt ? `${t('dashboard.nextDebt')}: ${nextDebt.lender}, day ${nextDebt.dueDay}` : t('dashboard.noDebt'),
    `${t('dashboard.activeGoals')}: ${store.state.goals.length}`,
  ];
});
</script>

<template>
  <section class="hero">
    <p class="eyebrow">{{ t('dashboard.eyebrow') }}</p>
    <h1>{{ t('dashboard.title') }}</h1>
    <p>{{ t('dashboard.subtitle') }}</p>
    <div class="actions">
      <RouterLink class="primary-button" to="/income/new">
        {{ t('dashboard.logIncome') }}
      </RouterLink>
      <RouterLink class="secondary-button" to="/onboarding">
        {{ t('dashboard.setup') }}
      </RouterLink>
    </div>
  </section>

  <section class="metrics-grid" aria-label="Financial snapshot">
    <article v-for="metric in metrics" :key="metric.label" class="metric">
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
    </article>
  </section>

  <section class="section-stack" style="margin-top: 18px">
    <article class="panel">
      <h2>{{ t('dashboard.allocationTable') }}</h2>
      <div class="data-list">
        <div v-for="goal in store.state.goals" :key="goal.id" class="data-row">
          <div class="row-main">
            <div>
              <strong>{{ goal.name }}</strong>
              <small>{{ money.format(goal.currentAmount) }} / {{ money.format(goal.targetAmount) }}</small>
            </div>
            <strong>{{ Math.round((goal.currentAmount / goal.targetAmount) * 100) }}%</strong>
          </div>
          <div class="progress">
            <span :style="{ display: 'block', width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }" />
          </div>
        </div>
      </div>
    </article>

    <article class="panel">
      <h2>{{ t('dashboard.upcoming') }}</h2>
      <div class="data-list">
        <div v-for="item in upcoming" :key="item" class="notice">{{ item }}</div>
      </div>
    </article>
  </section>
</template>
