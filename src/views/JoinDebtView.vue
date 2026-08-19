<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Check, KeyRound, LockKeyhole, Users } from '@lucide/vue';
import { acceptDebtSpaceInvite, previewDebtSpaceInvite } from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';

const pendingCodeKey = 'loop-pending-invite-code';
const router = useRouter();
const auth = useAuthStore();
const code = ref(normalizeCode(sessionStorage.getItem(pendingCodeKey) || ''));
const preview = ref<{ spaceId: string; inviterName: string } | null>(null);
const isChecking = ref(false);
const isJoining = ref(false);
const error = ref('');
let resumedCode = '';

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function updateCode(event: Event) {
  code.value = normalizeCode((event.target as HTMLInputElement).value);
  preview.value = null;
  error.value = '';

  if (code.value) sessionStorage.setItem(pendingCodeKey, code.value);
  else sessionStorage.removeItem(pendingCodeKey);
}

async function continueWithCode() {
  if (code.value.length !== 6) {
    error.value = 'Enter the complete six-character code.';
    return;
  }

  sessionStorage.setItem(pendingCodeKey, code.value);
  if (!auth.state.isAuthenticated) {
    await router.push('/login?redirect=/join');
    return;
  }

  isChecking.value = true;
  error.value = '';

  try {
    const response = await previewDebtSpaceInvite(code.value);
    if (response.alreadyJoined) {
      sessionStorage.removeItem(pendingCodeKey);
      await router.replace(`/debts/${response.spaceId}`);
      return;
    }
    preview.value = { spaceId: response.spaceId, inviterName: response.inviterName };
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'That invitation code could not be checked.';
  } finally {
    isChecking.value = false;
  }
}

async function joinDebt() {
  if (!preview.value) return;
  isJoining.value = true;
  error.value = '';

  try {
    const response = await acceptDebtSpaceInvite(code.value);
    sessionStorage.removeItem(pendingCodeKey);
    await router.replace(`/debts/${response.spaceId}`);
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'The shared debt could not be joined.';
  } finally {
    isJoining.value = false;
  }
}

function useAnotherCode() {
  preview.value = null;
  code.value = '';
  error.value = '';
  resumedCode = '';
  sessionStorage.removeItem(pendingCodeKey);
}

watch(
  () => [auth.isReady.value, auth.state.uid, code.value] as const,
  ([ready, uid, nextCode]) => {
    if (!ready || !uid || nextCode.length !== 6 || nextCode === resumedCode || preview.value) return;
    resumedCode = nextCode;
    void continueWithCode();
  },
  { immediate: true },
);
</script>

<template>
  <section class="join-page">
    <RouterLink class="join-back" to="/debts" aria-label="Back to shared debts">
      <ArrowLeft :size="20" />
    </RouterLink>

    <div v-if="!preview" class="join-panel">
      <div class="join-icon"><KeyRound :size="28" /></div>
      <span class="wordmark">Loop Debts</span>
      <h1>Join a shared debt</h1>
      <p>Enter the six-character code you received.</p>

      <label class="code-input-wrap">
        <span>Invitation code</span>
        <input
          :value="code"
          autocomplete="one-time-code"
          autocapitalize="characters"
          inputmode="text"
          maxlength="7"
          placeholder="7KM42P"
          aria-label="Invitation code"
          @input="updateCode"
          @keyup.enter="continueWithCode"
        />
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="gold-button" type="button" :disabled="isChecking || code.length !== 6" @click="continueWithCode">
        <span>{{ isChecking ? 'Checking…' : auth.state.isAuthenticated ? 'Continue' : 'Log in to continue' }}</span>
        <ArrowRight v-if="!isChecking" :size="18" />
      </button>

      <div class="join-privacy-note">
        <LockKeyhole :size="17" />
        <span>The code connects one person to one private note.</span>
      </div>
    </div>

    <div v-else class="join-panel confirmation">
      <div class="join-icon confirmed"><Users :size="28" /></div>
      <span class="sheet-kicker">Invitation found</span>
      <h1>{{ preview.inviterName }} invited you</h1>
      <p>Join this private shared debt? Only the two of you can open it.</p>

      <div class="join-confirmation-row">
        <Check :size="18" />
        <span>Private shared debt</span>
      </div>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="gold-button" type="button" :disabled="isJoining" @click="joinDebt">
        <span>{{ isJoining ? 'Joining…' : `Join ${preview.inviterName}` }}</span>
        <ArrowRight v-if="!isJoining" :size="18" />
      </button>
      <button class="quiet-button" type="button" :disabled="isJoining" @click="useAnotherCode">Use another code</button>
    </div>
  </section>
</template>
