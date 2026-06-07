<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  Banknote,
  CircleDollarSign,
  ClipboardList,
  Flag,
  Home,
  Menu,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UserCircle,
  X,
} from '@lucide/vue';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const { locale, t } = useI18n();
const auth = useAuthStore();
const isDrawerOpen = ref(false);

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard'), icon: Home },
  { path: '/income/new', label: t('nav.income'), icon: CircleDollarSign },
]);

const showBottomNav = computed(() => route.path !== '/login');
const showTopActions = computed(() => route.path !== '/login');

const drawerItems = computed(() => [
  { path: '/settings', label: t('nav.settings'), description: t('drawer.settings'), icon: Settings },
  { path: '/onboarding', label: t('drawer.setup'), description: t('drawer.setupBody'), icon: SlidersHorizontal },
  { path: '/goals', label: t('nav.goals'), description: t('drawer.goals'), icon: Flag },
  { path: '/debts', label: t('nav.debts'), description: t('drawer.debts'), icon: Banknote },
  { path: '/rules', label: t('nav.rules'), description: t('drawer.rules'), icon: ShieldCheck },
  { path: '/forecast', label: t('nav.forecast'), description: t('drawer.forecast'), icon: TrendingUp },
  { path: '/login', label: auth.state.isAuthenticated ? t('auth.account') : t('auth.login'), description: t('drawer.account'), icon: UserCircle },
]);

watch(
  () => route.fullPath,
  () => {
    isDrawerOpen.value = false;
  },
);

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

      <div v-if="showTopActions" class="top-actions">
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
        <component :is="item.icon" :size="21" />
        <span>{{ item.label }}</span>
      </RouterLink>

      <button class="nav-menu-button" type="button" :aria-label="t('nav.menu')" @click="isDrawerOpen = true">
        <Menu :size="21" />
        <span>{{ t('nav.menu') }}</span>
      </button>
    </nav>

    <div v-if="isDrawerOpen" class="drawer-overlay" @click="isDrawerOpen = false" />
    <aside class="side-drawer" :class="{ open: isDrawerOpen }" :aria-hidden="!isDrawerOpen">
      <div class="drawer-header">
        <div>
          <p class="eyebrow">{{ t('drawer.title') }}</p>
          <h2>{{ t('drawer.manage') }}</h2>
        </div>
        <button class="icon-button" type="button" :aria-label="t('nav.close')" @click="isDrawerOpen = false">
          <X :size="21" />
        </button>
      </div>

      <div class="drawer-list">
        <RouterLink v-for="item in drawerItems" :key="item.path" class="drawer-link" :to="item.path">
          <component :is="item.icon" :size="21" />
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.description }}</small>
          </span>
        </RouterLink>
      </div>

      <div class="drawer-footer">
        <ClipboardList :size="18" />
        <span>{{ t('drawer.footer') }}</span>
      </div>
    </aside>
  </div>
</template>
