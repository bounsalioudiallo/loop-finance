<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Mail, Phone, ShieldCheck } from '@lucide/vue';
import { useAuthStore } from '@/stores/authStore';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const showAdditionalAuthMethods = false;

const form = reactive({
  method: 'email' as 'email' | 'phone',
  email: auth.state.email || '',
  password: '',
  phone: '',
  code: '',
  phoneCodeSent: false,
  isLoading: false,
  error: '',
});

async function submit() {
  if (!form.email.trim() || !form.password) return;
  form.isLoading = true;
  form.error = '';

  try {
    await auth.signIn({
      email: form.email,
      password: form.password,
    });
    router.push(String(route.query.redirect || '/'));
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  } finally {
    form.isLoading = false;
  }
}

async function submitGoogle() {
  form.isLoading = true;
  form.error = '';

  try {
    await auth.signInWithGoogle();
    router.push(String(route.query.redirect || '/'));
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  } finally {
    form.isLoading = false;
  }
}

async function sendPhoneCode() {
  if (!form.phone.trim()) return;
  form.isLoading = true;
  form.error = '';

  try {
    await auth.sendPhoneCode(form.phone);
    form.phoneCodeSent = true;
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  } finally {
    form.isLoading = false;
  }
}

async function confirmPhoneCode() {
  if (!form.code.trim()) return;
  form.isLoading = true;
  form.error = '';

  try {
    await auth.confirmPhoneCode(form.code);
    router.push(String(route.query.redirect || '/'));
  } catch (error) {
    form.error = error instanceof Error ? error.message : t('auth.error');
  } finally {
    form.isLoading = false;
  }
}
</script>

<template>
  <section class="auth-screen">
    <div class="auth-intro">
      <div class="auth-mark">
        <ShieldCheck :size="26" />
      </div>
      <p class="eyebrow">{{ t('auth.eyebrow') }}</p>
      <h1>{{ t('auth.title') }}</h1>
      <p>{{ t('auth.subtitle') }}</p>
    </div>

    <article class="auth-card">
      <div class="auth-provider-grid">
        <button class="auth-provider-button google" type="button" :disabled="form.isLoading" @click="submitGoogle">
          <span class="google-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                fill="#4285f4"
                d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.1-2 3.4-4.9 3.4-8.2z"
              />
              <path
                fill="#34a853"
                d="M12 24c3.1 0 5.7-1 7.7-2.7L16 18.5c-1 .7-2.3 1.1-4 1.1-3 0-5.5-2-6.4-4.8H1.8v2.9C3.7 21.4 7.5 24 12 24z"
              />
              <path
                fill="#fbbc05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3v-3H1.8C1 8.8.5 10.6.5 12.5s.5 3.7 1.3 5.3l3.8-3z"
              />
              <path
                fill="#ea4335"
                d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 2 15.1 1 12 1 7.5 1 3.7 3.6 1.8 7.2l3.8 3C6.5 7.4 9 5.4 12 5.4z"
              />
            </svg>
          </span>
          <strong>{{ t('auth.google') }}</strong>
        </button>
        <button
          v-if="showAdditionalAuthMethods"
          class="auth-provider-button"
          :class="{ active: form.method === 'phone' }"
          type="button"
          @click="form.method = 'phone'"
        >
          <Phone :size="18" />
          <strong>{{ t('auth.phone') }}</strong>
        </button>
        <button
          v-if="showAdditionalAuthMethods"
          class="auth-provider-button"
          :class="{ active: form.method === 'email' }"
          type="button"
          @click="form.method = 'email'"
        >
          <Mail :size="18" />
          <strong>{{ t('auth.emailPassword') }}</strong>
        </button>
      </div>

      <form
        v-if="showAdditionalAuthMethods && form.method === 'email'"
        class="auth-method-form"
        @submit.prevent="submit"
      >
        <label>
          <span>{{ t('auth.email') }}</span>
          <input v-model="form.email" autocomplete="email" placeholder="you@example.com" type="email" />
        </label>

        <label>
          <span>{{ t('auth.password') }}</span>
          <input v-model="form.password" autocomplete="current-password" type="password" />
        </label>

        <button class="primary-button auth-submit" type="submit" :disabled="form.isLoading">
          {{ form.isLoading ? t('auth.working') : t('auth.continue') }}
        </button>
      </form>

      <form
        v-else-if="showAdditionalAuthMethods"
        class="auth-method-form"
        @submit.prevent="form.phoneCodeSent ? confirmPhoneCode() : sendPhoneCode()"
      >
        <label>
          <span>{{ t('auth.phoneNumber') }}</span>
          <input v-model="form.phone" autocomplete="tel" inputmode="tel" placeholder="+1 555 000 0000" type="tel" />
        </label>

        <label v-if="form.phoneCodeSent">
          <span>{{ t('auth.verificationCode') }}</span>
          <input v-model="form.code" autocomplete="one-time-code" inputmode="numeric" type="text" />
        </label>

        <button class="primary-button auth-submit" type="submit" :disabled="form.isLoading">
          {{ form.phoneCodeSent ? t('auth.verifyCode') : t('auth.sendCode') }}
        </button>
      </form>

      <div id="recaptcha-container" />

      <p v-if="form.error" class="notice auth-message">{{ form.error }}</p>
    </article>
  </section>
</template>
