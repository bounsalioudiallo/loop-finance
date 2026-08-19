<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, Eye, EyeOff } from '@lucide/vue';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const hasPendingInviteCode = Boolean(sessionStorage.getItem('loop-pending-invite-code'));

const form = reactive({
  email: auth.state.email || '',
  password: '',
  showPassword: false,
  isLoading: false,
  error: '',
});

async function submit() {
  if (!form.email.trim() || !form.password) return;
  form.isLoading = true;
  form.error = '';

  try {
    await auth.signIn({ email: form.email, password: form.password });
    await router.replace(String(route.query.redirect || '/debts'));
  } catch (error) {
    form.error = error instanceof Error ? error.message : 'We could not log you in. Try again.';
  } finally {
    form.isLoading = false;
  }
}

async function continueWithGoogle() {
  form.isLoading = true;
  form.error = '';

  try {
    await auth.signInWithGoogle();
    await router.replace(String(route.query.redirect || '/debts'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('popup-closed-by-user')) return;
    form.error = error instanceof Error ? error.message : 'Google sign-in could not be completed.';
  } finally {
    form.isLoading = false;
  }
}
</script>

<template>
  <section class="login-page">
    <div class="login-panel">
      <div class="login-intro">
        <span class="wordmark">Loop Debts</span>
        <h1>Your shared debts,<br />in one place.</h1>
        <p>Log in to open the private notes shared with you.</p>
      </div>

      <button class="google-button" type="button" :disabled="form.isLoading" @click="continueWithGoogle">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path fill="#4285f4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6.5c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.1-2 3.4-4.9 3.4-8.2z" />
          <path fill="#34a853" d="M12 24c3.1 0 5.7-1 7.7-2.7L16 18.5c-1 .7-2.3 1.1-4 1.1-3 0-5.5-2-6.4-4.8H1.8v2.9C3.7 21.4 7.5 24 12 24z" />
          <path fill="#fbbc05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3v-3H1.8C1 8.8.5 10.6.5 12.5s.5 3.7 1.3 5.3l3.8-3z" />
          <path fill="#ea4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 2 15.1 1 12 1 7.5 1 3.7 3.6 1.8 7.2l3.8 3C6.5 7.4 9 5.4 12 5.4z" />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div class="auth-divider"><span>or use email</span></div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>Email</span>
          <input v-model="form.email" autocomplete="email" inputmode="email" type="email" required />
        </label>

        <label>
          <span>Password</span>
          <span class="password-field">
            <input
              v-model="form.password"
              autocomplete="current-password"
              :type="form.showPassword ? 'text' : 'password'"
              required
            />
            <button
              type="button"
              :aria-label="form.showPassword ? 'Hide password' : 'Show password'"
              @click="form.showPassword = !form.showPassword"
            >
              <EyeOff v-if="form.showPassword" :size="19" />
              <Eye v-else :size="19" />
            </button>
          </span>
        </label>

        <p v-if="form.error" class="form-error">{{ form.error }}</p>

        <button class="gold-button" type="submit" :disabled="form.isLoading">
          <span>{{ form.isLoading ? 'Opening…' : 'Log in' }}</span>
          <ArrowRight v-if="!form.isLoading" :size="18" />
        </button>
      </form>

      <p v-if="hasPendingInviteCode" class="login-footnote pending-code-note">
        Your invitation code is saved. Log in to continue.
      </p>
      <p v-else class="login-footnote">
        Invited? <RouterLink to="/join">Enter your invitation code</RouterLink>
      </p>
    </div>
  </section>
</template>
