<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';
import type { IncomeProfile } from '@/domain/finance';

const { t } = useI18n();
const router = useRouter();
const store = useFinanceStore();

const form = reactive({
  amount: '1200',
  source: '',
  profile: store.state.settings.incomeProfile,
});

function submitIncome() {
  const amount = Number(form.amount);

  if (!Number.isFinite(amount) || amount <= 0) return;

  const income = store.addIncomeEvent({
    amount,
    source: form.source || 'Manual income',
    profile: form.profile as IncomeProfile,
  });

  router.push(`/allocate/${income.id}`);
}
</script>

<template>
  <section class="page-header">
    <h1>{{ t('income.title') }}</h1>
    <p>{{ t('income.subtitle') }}</p>
  </section>

  <form class="form-panel" @submit.prevent="submitIncome">
    <div class="form-grid">
      <label>
        <span>{{ t('income.amount') }}</span>
        <input v-model="form.amount" inputmode="decimal" placeholder="1200" type="text" />
      </label>

      <label>
        <span>{{ t('income.source') }}</span>
        <input v-model="form.source" placeholder="Client, employer, project" type="text" />
      </label>

      <label>
        <span>{{ t('income.profile') }}</span>
        <select v-model="form.profile">
          <option value="monthly">{{ t('income.profiles.monthly') }}</option>
          <option value="biweekly">{{ t('income.profiles.biweekly') }}</option>
          <option value="weekly">{{ t('income.profiles.weekly') }}</option>
          <option value="project">{{ t('income.profiles.project') }}</option>
          <option value="mixed">{{ t('income.profiles.mixed') }}</option>
        </select>
      </label>
    </div>

    <div class="actions" style="margin-top: 18px">
      <button class="primary-button" type="submit">{{ t('income.continue') }}</button>
    </div>
  </form>
</template>
