<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { AlertTriangle, CheckCircle2, TrendingUp } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const store = useFinanceStore();

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
      maximumFractionDigits: 0,
    }),
);

const forecast = computed(() => store.forecast.value);

function timelineLabel(months: number | null) {
  if (!months) return t('forecast.needsIncome');
  if (months === 1) return t('forecast.oneMonth');

  return t('forecast.monthCount', { count: months });
}
</script>

<template>
  <AppPageHeader :title="t('forecast.title')" :subtitle="t('forecast.subtitle')" />

  <section class="section-stack">
    <article class="metrics-grid">
      <div class="metric forecast-lead-metric">
        <span>{{ t('forecast.expectedIncome') }}</span>
        <strong>{{ money.format(forecast.expectedMonthlyIncome) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('forecast.mode') }}</span>
        <strong>{{ t(`modes.${store.state.settings.allocationMode}`) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('forecast.activeGoals') }}</span>
        <strong>{{ forecast.goalForecasts.length }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('forecast.activeDebts') }}</span>
        <strong>{{ forecast.debtForecasts.length }}</strong>
      </div>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>{{ t('forecast.scenarios') }}</h2>
        <TrendingUp :size="20" />
      </div>
      <div class="scenario-grid">
        <div v-for="scenario in forecast.scenarios" :key="scenario.id" class="scenario-card">
          <span>{{ t(`forecast.scenarioNames.${scenario.id}`) }}</span>
          <strong>{{ money.format(scenario.monthlyIncome) }}</strong>
          <small>{{ t('forecast.afterDebt', { amount: money.format(scenario.monthlyAfterDebtMinimums) }) }}</small>
        </div>
      </div>
    </article>

    <article class="panel">
      <h2>{{ t('forecast.predictiveAlerts') }}</h2>
      <div class="data-list">
        <div
          v-for="alert in forecast.alerts"
          :key="alert.id"
          class="forecast-alert"
          :class="`forecast-alert-${alert.level}`"
        >
          <component :is="alert.level === 'good' ? CheckCircle2 : AlertTriangle" :size="19" />
          <div>
            <strong>{{ t(alert.titleKey) }}</strong>
            <span>{{ t(alert.bodyKey) }}</span>
          </div>
        </div>
      </div>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>{{ t('forecast.goalTimelines') }}</h2>
        <RouterLink class="secondary-button" to="/goals">{{ t('nav.goals') }}</RouterLink>
      </div>
      <div class="data-list">
        <div v-for="goal in forecast.goalForecasts" :key="goal.goalId" class="data-row">
          <div class="row-main">
            <div>
              <strong>{{ goal.name }}</strong>
              <small>{{ t('forecast.remaining', { amount: money.format(goal.remainingAmount) }) }}</small>
            </div>
            <strong>{{ timelineLabel(goal.monthsToComplete) }}</strong>
          </div>
          <div class="progress">
            <span
              :style="{
                display: 'block',
                width: `${Math.min(100, goal.monthlyContribution > 0 ? 100 / Math.max(goal.monthsToComplete || 1, 1) : 0)}%`,
              }"
            />
          </div>
          <small class="muted">{{ t('forecast.monthlyContribution', { amount: money.format(goal.monthlyContribution) }) }}</small>
        </div>
        <p v-if="forecast.goalForecasts.length === 0" class="muted">{{ t('forecast.noGoals') }}</p>
      </div>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>{{ t('forecast.debtTimelines') }}</h2>
        <RouterLink class="secondary-button" to="/debts">{{ t('nav.debts') }}</RouterLink>
      </div>
      <div class="data-list">
        <div v-for="debt in forecast.debtForecasts" :key="debt.debtId" class="data-row compact-row">
          <div class="row-main">
            <div>
              <strong>{{ debt.lender }}</strong>
              <small>{{ t('forecast.remaining', { amount: money.format(debt.remainingAmount) }) }}</small>
            </div>
            <span>{{ timelineLabel(debt.monthsToPayoff) }}</span>
          </div>
        </div>
        <p v-if="forecast.debtForecasts.length === 0" class="muted">{{ t('forecast.noDebts') }}</p>
      </div>
    </article>
  </section>
</template>
