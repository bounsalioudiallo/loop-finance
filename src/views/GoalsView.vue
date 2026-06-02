<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const store = useFinanceStore();

const form = reactive({
  name: '',
  currentAmount: '0',
  targetAmount: '1000',
  priority: '2',
});

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

function addGoal() {
  if (!form.name.trim()) return;

  store.addGoal({
    name: form.name.trim(),
    currentAmount: Number(form.currentAmount) || 0,
    targetAmount: Number(form.targetAmount) || 1,
    priority: Number(form.priority) || 1,
  });

  form.name = '';
  form.currentAmount = '0';
  form.targetAmount = '1000';
  form.priority = '2';
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('goals.title') }}</h1>
    <p>{{ t('goals.subtitle') }}</p>
  </section>

  <section class="section-stack">
    <form class="form-panel" @submit.prevent="addGoal">
      <div class="form-grid">
        <label>
          <span>{{ t('goals.name') }}</span>
          <input v-model="form.name" placeholder="Emergency Fund" type="text" />
        </label>
        <label>
          <span>{{ t('goals.current') }}</span>
          <input v-model="form.currentAmount" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('goals.target') }}</span>
          <input v-model="form.targetAmount" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('goals.priority') }}</span>
          <select v-model="form.priority">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
      </div>
      <div class="actions" style="margin-top: 18px">
        <button class="primary-button" type="submit">{{ t('goals.add') }}</button>
      </div>
    </form>

    <article class="panel">
      <h2>{{ t('goals.active') }}</h2>
      <div class="data-list">
        <div v-for="goal in store.state.goals" :key="goal.id" class="data-row">
          <div class="row-main">
            <div>
              <strong>{{ goal.name }}</strong>
              <small>{{ money.format(goal.currentAmount) }} / {{ money.format(goal.targetAmount) }}</small>
            </div>
            <button class="danger-button" type="button" @click="store.removeGoal(goal.id)">
              {{ t('actions.delete') }}
            </button>
          </div>
          <div class="progress">
            <span :style="{ display: 'block', width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%` }" />
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
