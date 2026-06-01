<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const formatter = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'USD',
    }),
);

const rows = computed(() => [
  { category: 'Emergency Fund', amount: 285, progress: 24 },
  { category: 'Debt Extra', amount: 237.5, progress: 60 },
  { category: 'Business Fund', amount: 142.5, progress: 15 },
  { category: 'Savings', amount: 190, progress: 32 },
  { category: 'Free Spending', amount: 95, progress: 100 },
]);
</script>

<template>
  <section class="panel" style="margin-top: 18px">
    <h2>{{ t('dashboard.allocationPlan') }}</h2>
    <div class="allocation-list">
      <article v-for="row in rows" :key="row.category" class="allocation-row">
        <div class="allocation-heading">
          <strong>{{ row.category }}</strong>
          <span>{{ formatter.format(row.amount) }}</span>
        </div>
        <div class="progress">
          <span :style="{ display: 'block', width: `${row.progress}%` }" />
        </div>
      </article>
    </div>
  </section>
</template>
