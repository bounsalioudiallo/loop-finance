<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useFinanceStore } from '@/stores/financeStore';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const store = useFinanceStore();
const approved = ref(false);

const incomeId = computed(() => String(route.params.incomeId));
const income = computed(() => store.getIncomeEvent(incomeId.value));
const plan = computed(() => store.previewAllocation(incomeId.value));

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

function approve() {
  store.approveAllocation(incomeId.value);
  approved.value = true;
  window.setTimeout(() => router.push('/'), 800);
}
</script>

<template>
  <AppPageHeader
    :title="income ? t('allocation.title', { amount: money.format(income.amount) }) : t('allocation.missing')"
    :subtitle="t('allocation.subtitle')"
    show-back
  />

  <section v-if="plan" class="section-stack">
    <article class="panel">
      <h2>{{ t('allocation.plan') }}</h2>
      <div class="data-list">
        <div v-for="line in plan.lines" :key="line.id" class="allocation-row">
          <div class="allocation-heading">
            <strong>{{ line.label }}</strong>
            <span>{{ money.format(line.amount) }}</span>
          </div>
          <small class="muted">{{ line.explanation }}</small>
        </div>
      </div>
    </article>

    <article class="metrics-grid">
      <div class="metric">
        <span>{{ t('allocation.income') }}</span>
        <strong>{{ money.format(plan.incomeAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('dashboard.allocated') }}</span>
        <strong>{{ money.format(plan.allocatedAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('dashboard.remaining') }}</span>
        <strong>{{ money.format(plan.remainingAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('allocation.mode') }}</span>
        <strong>{{ t(`modes.${store.state.settings.allocationMode}`) }}</strong>
      </div>
    </article>

    <div v-if="approved" class="notice">{{ t('allocation.approved') }}</div>

    <div class="actions">
      <button class="primary-button" type="button" @click="approve">
        {{ t('allocation.allocateNow') }}
      </button>
      <RouterLink class="secondary-button" to="/income/new">{{ t('actions.adjust') }}</RouterLink>
      <RouterLink class="secondary-button" to="/">{{ t('actions.remindLater') }}</RouterLink>
    </div>
  </section>
</template>
