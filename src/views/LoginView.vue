<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useAuthStore } from '@/stores/authStore';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  displayName: auth.state.displayName || '',
  email: auth.state.email || '',
  password: '',
  error: '',
});

async function submit() {
  if (!form.email.trim() || !form.password) return;

  try {
    await auth.signIn({
      displayName: form.displayName,
      email: form.email,
      password: form.password,
    });
    router.push('/');
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  }
}

async function submitGoogle() {
  try {
    await auth.signInWithGoogle();
    router.push('/');
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  }
}
</script>

<template>
  <AppPageHeader class="auth-hero" :title="t('auth.title')" :subtitle="t('auth.subtitle')" />

  <form class="form-panel auth-panel" @submit.prevent="submit">
    <div class="form-grid">
      <label>
        <span>{{ t('auth.name') }}</span>
        <input v-model="form.displayName" autocomplete="name" placeholder="Saikou Diallo" type="text" />
      </label>

      <label>
        <span>{{ t('auth.email') }}</span>
        <input v-model="form.email" autocomplete="email" placeholder="you@example.com" type="email" />
      </label>

      <label>
        <span>{{ t('auth.password') }}</span>
        <input v-model="form.password" autocomplete="current-password" type="password" />
      </label>
    </div>

    <div class="actions" style="margin-top: 18px">
      <button class="primary-button" type="submit">{{ t('auth.continue') }}</button>
      <button class="secondary-button" type="button" @click="submitGoogle">{{ t('auth.google') }}</button>
    </div>

    <p v-if="form.error" class="notice" style="margin: 14px 0 0">{{ form.error }}</p>
    <p class="muted" style="margin: 14px 0 0">{{ t('auth.firebaseNote') }}</p>
  </form>
</template>
