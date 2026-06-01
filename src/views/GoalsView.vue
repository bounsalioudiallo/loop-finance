<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('goals.title') }}</h1>
    <p>{{ t('goals.subtitle') }}</p>
  </section>

  <section class="panel">
    <h2>{{ t('goals.empty') }}</h2>
    <p>Emergency fund, business fund, savings, family support, and custom goals will live here.</p>
  </section>
</template>
