<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const finance = useFinanceStore();

const profileRows = computed(() => [
  { label: t('settings.incomeProfile'), value: t(`income.profiles.${finance.state.settings.incomeProfile}`) },
  { label: t('settings.allocationMode'), value: t(`modes.${finance.state.settings.allocationMode}`) },
  { label: t('settings.currency'), value: finance.state.settings.currency },
  { label: t('settings.language'), value: finance.state.settings.language.toUpperCase() },
]);

const managementLinks = computed(() => [
  { to: '/onboarding', title: t('settings.setupTitle'), body: t('settings.setupBody') },
  { to: '/goals', title: t('goals.title'), body: t('settings.goalsBody') },
  { to: '/debts', title: t('debts.title'), body: t('settings.debtsBody') },
  { to: '/rules', title: t('rules.title'), body: t('settings.rulesBody') },
  { to: '/forecast', title: t('forecast.title'), body: t('settings.forecastBody') },
]);

async function signOut() {
  await auth.signOut();
  router.push('/login');
}
</script>

<template>
  <AppPageHeader :title="t('settings.title')" :subtitle="t('settings.subtitle')" />

  <section class="section-stack">
    <article class="panel">
      <div class="row-main">
        <div>
          <h2>{{ auth.state.isAuthenticated ? auth.state.displayName : t('settings.guest') }}</h2>
          <p class="muted">{{ auth.state.isAuthenticated ? auth.state.email : t('settings.loginPrompt') }}</p>
        </div>
        <RouterLink v-if="!auth.state.isAuthenticated" class="primary-button" to="/login">
          {{ t('auth.login') }}
        </RouterLink>
        <button v-else class="secondary-button" type="button" @click="signOut">
          {{ t('auth.signOut') }}
        </button>
      </div>
    </article>

    <article class="panel">
      <h2>{{ t('settings.profile') }}</h2>
      <div class="data-list">
        <div v-for="row in profileRows" :key="row.label" class="data-row compact-row">
          <div class="row-main">
            <strong>{{ row.label }}</strong>
            <span>{{ row.value }}</span>
          </div>
        </div>
      </div>
    </article>

    <article class="panel">
      <h2>{{ t('settings.manage') }}</h2>
      <div class="data-list">
        <RouterLink v-for="link in managementLinks" :key="link.to" class="settings-link" :to="link.to">
          <strong>{{ link.title }}</strong>
          <span>{{ link.body }}</span>
        </RouterLink>
      </div>
    </article>
  </section>
</template>
