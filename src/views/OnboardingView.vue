<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useFinanceStore } from '@/stores/financeStore';
import type { AllocationMode, IncomeProfile } from '@/domain/finance';

const { t, locale } = useI18n();
const router = useRouter();
const store = useFinanceStore();

const form = reactive({
  incomeProfile: store.state.settings.incomeProfile,
  allocationMode: store.state.settings.allocationMode,
  language: store.state.settings.language,
  currency: store.state.settings.currency,
});

function save() {
  store.saveSettings({
    incomeProfile: form.incomeProfile as IncomeProfile,
    allocationMode: form.allocationMode as AllocationMode,
    language: form.language as 'en' | 'fr',
    currency: form.currency,
  });
  locale.value = form.language;
  localStorage.setItem('loop-locale', form.language);
  router.push('/');
}
</script>

<template>
  <AppPageHeader :title="t('onboarding.title')" :subtitle="t('onboarding.subtitle')" show-back />

  <form class="form-panel" @submit.prevent="save">
    <div class="form-grid">
      <label>
        <span>{{ t('onboarding.incomeProfile') }}</span>
        <select v-model="form.incomeProfile">
          <option value="monthly">{{ t('income.profiles.monthly') }}</option>
          <option value="biweekly">{{ t('income.profiles.biweekly') }}</option>
          <option value="weekly">{{ t('income.profiles.weekly') }}</option>
          <option value="project">{{ t('income.profiles.project') }}</option>
          <option value="mixed">{{ t('income.profiles.mixed') }}</option>
        </select>
      </label>

      <label>
        <span>{{ t('onboarding.allocationMode') }}</span>
        <select v-model="form.allocationMode">
          <option value="balanced">{{ t('modes.balanced') }}</option>
          <option value="aggressive">{{ t('modes.aggressive') }}</option>
          <option value="stability">{{ t('modes.stability') }}</option>
          <option value="family">{{ t('modes.family') }}</option>
        </select>
      </label>

      <label>
        <span>{{ t('onboarding.language') }}</span>
        <select v-model="form.language">
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </label>

      <label>
        <span>{{ t('onboarding.currency') }}</span>
        <select v-model="form.currency">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="XOF">XOF</option>
        </select>
      </label>
    </div>

    <div class="actions" style="margin-top: 18px">
      <button class="primary-button" type="submit">{{ t('actions.save') }}</button>
    </div>
  </form>
</template>
