<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const { locale, t } = useI18n();
const auth = useAuthStore();

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard') },
  { path: '/income/new', label: t('nav.income') },
  { path: '/settings', label: t('nav.settings') },
]);

const showBottomNav = computed(() => route.path !== '/login');

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

      <div class="top-actions">
        <button class="language-toggle" type="button" @click="toggleLocale">
          {{ locale === 'en' ? 'FR' : 'EN' }}
        </button>

        <RouterLink
          class="account-link"
          :to="auth.state.isAuthenticated ? '/settings' : '/login'"
          :aria-label="auth.state.isAuthenticated ? t('settings.title') : t('auth.login')"
        >
          {{ auth.state.isAuthenticated ? auth.initials.value : t('auth.login') }}
        </RouterLink>
      </div>
    </header>

    <main class="screen">
      <RouterView />
    </main>

    <nav v-if="showBottomNav" class="bottom-nav" :aria-label="t('nav.primary')">
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
