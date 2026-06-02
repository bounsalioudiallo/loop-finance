<script setup lang="ts">
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';
import type { RuleType } from '@/domain/finance';

const { t } = useI18n();
const store = useFinanceStore();

const form = reactive({
  label: '',
  category: '',
  type: 'fixed',
  value: '100',
});

function addRule() {
  if (!form.label.trim() || !form.category.trim()) return;

  store.addRule({
    label: form.label.trim(),
    category: form.category.trim(),
    type: form.type as RuleType,
    value: Number(form.value) || 0,
  });

  form.label = '';
  form.category = '';
}
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('rules.title') }}</h1>
    <p>{{ t('rules.subtitle') }}</p>
  </section>

  <section class="section-stack">
    <form class="form-panel" @submit.prevent="addRule">
      <div class="form-grid">
        <label>
          <span>{{ t('rules.label') }}</span>
          <input v-model="form.label" placeholder="Always send $100 home first." type="text" />
        </label>
        <label>
          <span>{{ t('rules.category') }}</span>
          <input v-model="form.category" placeholder="Family Support" type="text" />
        </label>
        <label>
          <span>{{ t('rules.type') }}</span>
          <select v-model="form.type">
            <option value="fixed">{{ t('rules.fixed') }}</option>
            <option value="minimumPercent">{{ t('rules.minimumPercent') }}</option>
            <option value="maximumPercent">{{ t('rules.maximumPercent') }}</option>
          </select>
        </label>
        <label>
          <span>{{ t('rules.value') }}</span>
          <input v-model="form.value" inputmode="decimal" type="text" />
        </label>
      </div>
      <div class="actions" style="margin-top: 18px">
        <button class="primary-button" type="submit">{{ t('rules.add') }}</button>
      </div>
    </form>

    <article class="panel">
      <h2>{{ t('rules.active') }}</h2>
      <div class="data-list">
        <div v-for="rule in store.state.rules" :key="rule.id" class="data-row">
          <div class="row-main">
            <div>
              <strong>{{ rule.category }}</strong>
              <small>{{ rule.label }} · {{ rule.value }}</small>
            </div>
            <button class="danger-button" type="button" @click="store.removeRule(rule.id)">
              {{ t('actions.delete') }}
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
