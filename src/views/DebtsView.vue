<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Copy, Link2, MessageSquareText, Plus, Users, WalletCards } from '@lucide/vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import type { PaymentFrequency } from '@/domain/finance';
import {
  createDebtSpaceInvite,
  watchDebtSpaces,
  type DebtSpace,
} from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';

const { t, locale } = useI18n();
const auth = useAuthStore();
const store = useFinanceStore();
const router = useRouter();
const today = new Date().toISOString().slice(0, 10);
const spaces = ref<DebtSpace[]>([]);
const isLoading = ref(false);
const error = ref('');
const inviteUrl = ref('');
const copied = ref(false);
let unsubscribeSpaces: (() => void) | undefined;

const form = reactive({
  title: '',
  counterpartyName: '',
  principalAmount: '1000',
  currentBalance: '1000',
  minimumPayment: '100',
  interestRate: '0',
  firstPaymentDate: today,
  paymentFrequency: 'monthly' as PaymentFrequency,
  openingNote: '',
});

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

watch(
  () => auth.state.uid,
  (uid) => {
    unsubscribeSpaces?.();
    spaces.value = [];

    if (!uid) return;

    unsubscribeSpaces = watchDebtSpaces(uid, (nextSpaces) => {
      spaces.value = nextSpaces;
    });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  unsubscribeSpaces?.();
});

function balanceFor(space: DebtSpace) {
  return Math.max(0, space.currentBalance);
}

function paidProgress(space: DebtSpace) {
  const paid = Math.max(0, space.principalAmount - balanceFor(space));
  return Math.round((paid / Math.max(space.principalAmount, 1)) * 100);
}

function memberNames(space: DebtSpace) {
  return space.memberIds
    .map((memberId) => space.memberProfiles?.[memberId]?.displayName || t('debts.member'))
    .join(' + ');
}

async function createSpace() {
  if (!auth.state.isAuthenticated) {
    router.push(`/login?redirect=${encodeURIComponent('/debts')}`);
    return;
  }

  if (!form.title.trim()) return;

  isLoading.value = true;
  error.value = '';
  inviteUrl.value = '';

  try {
    const response = await createDebtSpaceInvite({
      title: form.title.trim(),
      counterpartyName: form.counterpartyName.trim(),
      currency: store.state.settings.currency,
      principalAmount: Number(form.principalAmount) || 0,
      currentBalance: Number(form.currentBalance) || 0,
      minimumPayment: Number(form.minimumPayment) || 0,
      interestRate: Number(form.interestRate) || 0,
      firstPaymentDate: form.firstPaymentDate,
      paymentFrequency: form.paymentFrequency,
      openingNote: form.openingNote.trim(),
    });

    inviteUrl.value = `${window.location.origin}/debt/invite/${response.spaceId}?token=${encodeURIComponent(response.inviteToken)}`;
    form.title = '';
    form.counterpartyName = '';
    form.openingNote = '';
  } catch (event) {
    error.value = event instanceof Error ? event.message : t('debts.createError');
  } finally {
    isLoading.value = false;
  }
}

async function copyInvite() {
  if (!inviteUrl.value) return;
  copied.value = true;

  try {
    await navigator.clipboard.writeText(inviteUrl.value);
  } catch {
    window.prompt(t('share.copyFallback'), inviteUrl.value);
  }

  window.setTimeout(() => {
    copied.value = false;
  }, 1600);
}
</script>

<template>
  <AppPageHeader :title="t('debts.title')" :subtitle="t('debts.subtitle')" />

  <section v-if="!auth.state.isAuthenticated" class="empty-state debt-auth-state">
    <Users :size="34" />
    <h2>{{ t('debts.loginTitle') }}</h2>
    <p>{{ t('debts.loginBody') }}</p>
    <RouterLink class="primary-button" :to="`/login?redirect=${encodeURIComponent('/debts')}`">
      {{ t('auth.google') }}
    </RouterLink>
  </section>

  <section v-else class="debt-space-layout">
    <form class="form-panel debt-space-form" @submit.prevent="createSpace">
      <div class="debt-space-form-title">
        <div>
          <p class="eyebrow">{{ t('debts.createEyebrow') }}</p>
          <h2>{{ t('debts.createTitle') }}</h2>
        </div>
        <button class="primary-button" type="submit" :disabled="isLoading">
          <Plus :size="18" />
          {{ isLoading ? t('auth.working') : t('debts.create') }}
        </button>
      </div>

      <div class="form-grid debt-form-grid">
        <label class="debt-form-full">
          <span>{{ t('debts.spaceTitle') }}</span>
          <input v-model="form.title" placeholder="Nephew loan" type="text" />
        </label>
        <label>
          <span>{{ t('debts.counterparty') }}</span>
          <input v-model="form.counterpartyName" placeholder="John" type="text" />
        </label>
        <label>
          <span>{{ t('debts.original') }}</span>
          <input v-model="form.principalAmount" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.remaining') }}</span>
          <input v-model="form.currentBalance" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.minimum') }}</span>
          <input v-model="form.minimumPayment" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.interest') }}</span>
          <input v-model="form.interestRate" inputmode="decimal" type="text" />
        </label>
        <label>
          <span>{{ t('debts.firstPaymentDate') }}</span>
          <input v-model="form.firstPaymentDate" type="date" />
        </label>
        <label>
          <span>{{ t('debts.paymentFrequency') }}</span>
          <select v-model="form.paymentFrequency">
            <option value="weekly">{{ t('debts.frequencies.weekly') }}</option>
            <option value="monthly">{{ t('debts.frequencies.monthly') }}</option>
            <option value="yearly">{{ t('debts.frequencies.yearly') }}</option>
          </select>
        </label>
        <label class="debt-form-full">
          <span>{{ t('debts.openingNote') }}</span>
          <textarea v-model="form.openingNote" :placeholder="t('debts.openingNotePlaceholder')" rows="4" />
        </label>
      </div>

      <p v-if="error" class="notice">{{ error }}</p>

      <div v-if="inviteUrl" class="debt-invite-result">
        <Link2 :size="20" />
        <span>{{ inviteUrl }}</span>
        <button class="secondary-button" type="button" @click="copyInvite">
          <Copy :size="17" />
          {{ copied ? t('share.copied') : t('share.copyLink') }}
        </button>
      </div>
    </form>

    <section class="panel debt-space-panel">
      <div class="debt-space-section-heading">
        <div>
          <p class="eyebrow">{{ t('debts.boardEyebrow') }}</p>
          <h2>{{ t('debts.sharedSpaces') }}</h2>
        </div>
        <span>{{ spaces.length }}</span>
      </div>

      <div v-if="spaces.length === 0" class="empty-state compact">
        <MessageSquareText :size="30" />
        <h3>{{ t('debts.emptySpacesTitle') }}</h3>
        <p>{{ t('debts.emptySpacesBody') }}</p>
      </div>

      <div v-else class="debt-space-list">
        <RouterLink
          v-for="space in spaces"
          :key="space.id"
          class="debt-space-card"
          :to="`/debts/${space.id}`"
        >
          <div class="debt-space-card-main">
            <div class="debt-space-icon">
              <WalletCards :size="22" />
            </div>
            <div>
              <strong>{{ space.title }}</strong>
              <small>{{ memberNames(space) }}</small>
            </div>
          </div>
          <div class="debt-space-card-metrics">
            <span>{{ t('share.remainingBalance') }}</span>
            <strong>{{ money.format(balanceFor(space)) }}</strong>
          </div>
          <div class="progress">
            <span :style="{ display: 'block', width: `${paidProgress(space)}%` }" />
          </div>
          <div class="debt-space-card-footer">
            <span>{{ paidProgress(space) }}% {{ t('share.paidBack') }}</span>
            <span>{{ t(`debts.frequencies.${space.paymentFrequency}`) }}</span>
          </div>
        </RouterLink>
      </div>
    </section>
  </section>
</template>
