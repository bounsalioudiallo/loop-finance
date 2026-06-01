<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('debts.title') }}</h1>
    <p>{{ t('debts.subtitle') }}</p>
  </section>

  <section class="panel">
    <h2>{{ t('debts.empty') }}</h2>
    <p>Lender records, balances, payment plans, and shareable debt portals will build from this area.</p>
  </section>
</template>
