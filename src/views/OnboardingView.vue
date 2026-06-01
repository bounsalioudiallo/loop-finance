<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('onboarding.title') }}</h1>
    <p>{{ t('onboarding.subtitle') }}</p>
  </section>
</template>
