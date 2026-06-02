<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    showBack?: boolean;
    backTo?: string;
  }>(),
  {
    backTo: '/',
  },
);

const router = useRouter();
const { t } = useI18n();

function goBack() {
  const previousPath = window.history.state?.back;

  if (typeof previousPath === 'string' && previousPath.length > 0) {
    router.back();
    return;
  }

  router.push(props.backTo);
}
</script>

<template>
  <section class="page-header">
    <button v-if="showBack" class="inline-back-button" type="button" :aria-label="t('nav.back')" @click="goBack">
      <ArrowLeft :size="20" />
      <span>{{ t('nav.back') }}</span>
    </button>
    <h1>{{ title }}</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
  </section>
</template>
