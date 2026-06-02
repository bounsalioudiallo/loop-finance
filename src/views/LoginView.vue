<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/authStore';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const form = reactive({
  displayName: auth.state.displayName || '',
  email: auth.state.email || '',
});

function submit() {
  if (!form.email.trim()) return;

  auth.signIn({
    displayName: form.displayName,
    email: form.email,
  });
  router.push('/');
}
</script>

<template>
  <section class="hero auth-hero">
    <p class="eyebrow">Loop Finance</p>
    <h1>{{ t('auth.title') }}</h1>
    <p>{{ t('auth.subtitle') }}</p>
  </section>

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
    </div>

    <div class="actions" style="margin-top: 18px">
      <button class="primary-button" type="submit">{{ t('auth.continue') }}</button>
    </div>

    <p class="muted" style="margin: 14px 0 0">{{ t('auth.firebaseNote') }}</p>
  </form>
</template>
