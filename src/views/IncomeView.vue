<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="hero">
    <p class="eyebrow">Loop</p>
    <h1>{{ t('income.title') }}</h1>
    <p>{{ t('income.subtitle') }}</p>
  </section>

  <form class="form-panel">
    <div class="form-grid">
      <label>
        <span>{{ t('income.amount') }}</span>
        <input inputmode="decimal" placeholder="1200" type="text" />
      </label>

      <label>
        <span>{{ t('income.source') }}</span>
        <input placeholder="Client, employer, project" type="text" />
      </label>

      <label>
        <span>{{ t('income.profile') }}</span>
        <select>
          <option>{{ t('income.profiles.monthly') }}</option>
          <option>{{ t('income.profiles.biweekly') }}</option>
          <option>{{ t('income.profiles.weekly') }}</option>
          <option>{{ t('income.profiles.project') }}</option>
          <option>{{ t('income.profiles.mixed') }}</option>
        </select>
      </label>
    </div>

    <div class="actions" style="margin-top: 18px">
      <button class="primary-button" type="button">{{ t('income.continue') }}</button>
    </div>
  </form>
</template>
