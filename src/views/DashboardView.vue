<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AllocationPreview from '@/components/AllocationPreview.vue';

const { t, locale } = useI18n();

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }),
);

const metrics = computed(() => [
  { label: t('dashboard.incomeThisMonth'), value: money.value.format(3450) },
  { label: t('dashboard.allocated'), value: money.value.format(2800) },
  { label: t('dashboard.remaining'), value: money.value.format(650) },
  { label: t('dashboard.healthScore'), value: '82 / 100' },
]);
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
      <RouterLink class="secondary-button" to="/goals">
        {{ t('dashboard.setGoals') }}
      </RouterLink>
    </div>
  </section>

  <section class="metrics-grid" aria-label="Financial snapshot">
    <article v-for="metric in metrics" :key="metric.label" class="metric">
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
    </article>
  </section>

  <AllocationPreview />
</template>
