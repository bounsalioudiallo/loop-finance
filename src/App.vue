<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const { locale, t } = useI18n();

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard') },
  { path: '/income/new', label: t('nav.income') },
  { path: '/goals', label: t('nav.goals') },
  { path: '/debts', label: t('nav.debts') },
  { path: '/rules', label: t('nav.rules') },
]);

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'fr' : 'en';
  localStorage.setItem('loop-locale', locale.value);
}
</script>

<template>
  <div class="app-shell">
    <header class="top-bar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">L</span>
        <span>Loop</span>
      </RouterLink>

      <button class="language-toggle" type="button" @click="toggleLocale">
        {{ locale === 'en' ? 'FR' : 'EN' }}
      </button>
    </header>

    <main class="screen">
      <RouterView />
    </main>

    <nav class="bottom-nav" :aria-label="t('nav.primary')">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :class="{ active: route.path === item.path }"
        :to="item.path"
      >
        {{ item.label }}
      </RouterLink>
    </nav>
  </div>
</template>
