<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Copy,
  MessageSquareText,
  Pencil,
  ReceiptText,
  WalletCards,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import {
  addDebtSpaceEntry,
  watchDebtSpace,
  watchDebtSpaceEntries,
  type DebtSpace,
  type DebtSpaceEntry,
  type DebtSpaceEntryType,
} from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';
import { useFinanceStore } from '@/stores/financeStore';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const auth = useAuthStore();
const store = useFinanceStore();
const space = ref<DebtSpace | null>(null);
const entries = ref<DebtSpaceEntry[]>([]);
const isSaving = ref(false);
const error = ref('');
let unsubscribeSpace: (() => void) | undefined;
let unsubscribeEntries: (() => void) | undefined;

const entryForm = reactive({
  type: 'note' as DebtSpaceEntryType,
  amount: '',
  note: '',
});

const spaceId = computed(() => String(route.params.spaceId || ''));
const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: space.value?.currency || store.state.settings.currency,
    }),
);

watch(
  () => [spaceId.value, auth.state.uid] as const,
  ([nextSpaceId, uid]) => {
    unsubscribeSpace?.();
    unsubscribeEntries?.();
    space.value = null;
    entries.value = [];

    if (!uid) {
      router.push(`/login?redirect=${encodeURIComponent(route.fullPath)}`);
      return;
    }

    if (!nextSpaceId) return;

    unsubscribeSpace = watchDebtSpace(nextSpaceId, (nextSpace) => {
      space.value = nextSpace;
    });
    unsubscribeEntries = watchDebtSpaceEntries(nextSpaceId, (nextEntries) => {
      entries.value = nextEntries;
    });
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  unsubscribeSpace?.();
  unsubscribeEntries?.();
});

const payments = computed(() => entries.value.filter((entry) => entry.type === 'payment' && entry.amount));
const notes = computed(() => entries.value.filter((entry) => entry.type === 'note' || entry.type === 'agreement'));

const calculatedBalance = computed(() => {
  return Math.max(0, space.value?.currentBalance || 0);
});

const paidProgress = computed(() => {
  if (!space.value) return 0;
  const paid = Math.max(0, space.value.principalAmount - calculatedBalance.value);

  return Math.round((paid / Math.max(space.value.principalAmount, 1)) * 100);
});

const members = computed(() => {
  if (!space.value) return [];

  return space.value.memberIds.map((memberId) => ({
    id: memberId,
    name: space.value?.memberProfiles?.[memberId]?.displayName || t('debts.member'),
    role: memberId === space.value?.createdBy ? t('debts.creator') : t('debts.member'),
    isMe: memberId === auth.state.uid,
  }));
});

const latestNotesByMember = computed(() =>
  members.value.map((member) => ({
    ...member,
    note: notes.value.find((entry) => entry.authorId === member.id),
  })),
);

const timeline = computed(() =>
  entries.value.filter((entry) => entry.type !== 'note').slice(0, 12),
);

function formatDate(date: string) {
  if (!date) return t('debts.justNow');
  return new Date(date).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' });
}

function copyToDraft(text: string) {
  entryForm.type = 'note';
  entryForm.amount = '';
  entryForm.note = text;
}

async function saveEntry() {
  if (!space.value || !entryForm.note.trim()) return;

  isSaving.value = true;
  error.value = '';

  try {
    await addDebtSpaceEntry(space.value.id, {
      type: entryForm.type,
      note: entryForm.note,
      amount: entryForm.type === 'payment' || entryForm.type === 'correction'
        ? Number(entryForm.amount) || 0
        : null,
    });

    entryForm.type = 'note';
    entryForm.amount = '';
    entryForm.note = '';
  } catch (event) {
    error.value = event instanceof Error ? event.message : t('debts.entryError');
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <section v-if="!space" class="empty-state compact">
    <WalletCards :size="34" />
    <h2>{{ t('debts.loadingSpace') }}</h2>
    <p>{{ t('debts.loadingSpaceBody') }}</p>
  </section>

  <section v-else class="debt-board">
    <div class="debt-board-top">
      <RouterLink class="inline-back-button" to="/debts">
        <ArrowLeft :size="19" />
        <span>{{ t('nav.back') }}</span>
      </RouterLink>
      <div>
        <p class="eyebrow">{{ t('debts.sharedBoard') }}</p>
        <h1>{{ space.title }}</h1>
        <span>{{ members.map((member) => member.name).join(' + ') }}</span>
      </div>
    </div>

    <section class="debt-board-summary">
      <article class="debt-board-balance">
        <div class="share-card-label">
          <WalletCards :size="18" />
          <span>{{ t('share.remainingBalance') }}</span>
        </div>
        <strong>{{ money.format(calculatedBalance) }}</strong>
        <div class="progress">
          <span :style="{ display: 'block', width: `${paidProgress}%` }" />
        </div>
        <small>{{ paidProgress }}% {{ t('share.paidBack') }}</small>
      </article>

      <article class="debt-board-stat">
        <BadgeDollarSign :size="20" />
        <span>{{ t('debts.original') }}</span>
        <strong>{{ money.format(space.principalAmount) }}</strong>
      </article>

      <article class="debt-board-stat">
        <ReceiptText :size="20" />
        <span>{{ t('debts.loggedPayments') }}</span>
        <strong>{{ money.format(payments.reduce((total, entry) => total + (entry.amount || 0), 0)) }}</strong>
      </article>
    </section>

    <section class="note-compare-panel">
      <div class="debt-space-section-heading">
        <div>
          <p class="eyebrow">{{ t('debts.noteCompareEyebrow') }}</p>
          <h2>{{ t('debts.noteCompareTitle') }}</h2>
        </div>
        <MessageSquareText :size="22" />
      </div>

      <div class="note-compare-grid">
        <article v-for="member in latestNotesByMember" :key="member.id" class="note-compare-card" :class="{ mine: member.isMe }">
          <div class="note-compare-author">
            <div>
              <strong>{{ member.name }}</strong>
              <span>{{ member.isMe ? t('debts.yourSide') : member.role }}</span>
            </div>
            <CheckCircle2 v-if="member.note" :size="19" />
          </div>
          <p v-if="member.note" class="note-original">{{ member.note.note }}</p>
          <p v-else class="muted">{{ t('debts.noNoteYet') }}</p>
          <div v-if="member.note" class="note-compare-footer">
            <small>{{ formatDate(member.note.createdAt) }}</small>
            <button v-if="!member.isMe" class="secondary-button" type="button" @click="copyToDraft(member.note.note)">
              <Copy :size="16" />
              {{ t('debts.copyToMine') }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="debt-board-grid">
      <form class="form-panel debt-entry-form" @submit.prevent="saveEntry">
        <div class="debt-space-section-heading flush">
          <div>
            <p class="eyebrow">{{ t('debts.addEntryEyebrow') }}</p>
            <h2>{{ t('debts.addEntry') }}</h2>
          </div>
          <Pencil :size="21" />
        </div>

        <label>
          <span>{{ t('share.type') }}</span>
          <select v-model="entryForm.type">
            <option value="note">{{ t('debts.entryTypes.note') }}</option>
            <option value="payment">{{ t('debts.entryTypes.payment') }}</option>
            <option value="correction">{{ t('debts.entryTypes.correction') }}</option>
            <option value="agreement">{{ t('debts.entryTypes.agreement') }}</option>
          </select>
        </label>

        <label v-if="entryForm.type === 'payment' || entryForm.type === 'correction'">
          <span>{{ t('share.amount') }}</span>
          <input v-model="entryForm.amount" inputmode="decimal" type="text" />
        </label>

        <label>
          <span>{{ t('debts.note') }}</span>
          <textarea v-model="entryForm.note" :placeholder="t('debts.notePlaceholder')" rows="5" />
        </label>

        <p v-if="error" class="notice">{{ error }}</p>

        <button class="primary-button" type="submit" :disabled="isSaving">
          {{ isSaving ? t('auth.working') : t('debts.saveEntry') }}
        </button>
      </form>

      <section class="panel debt-timeline-panel">
        <div class="debt-space-section-heading">
          <div>
            <p class="eyebrow">{{ t('debts.activityEyebrow') }}</p>
            <h2>{{ t('debts.activity') }}</h2>
          </div>
          <span>{{ entries.length }}</span>
        </div>

        <div v-if="timeline.length === 0" class="empty-state compact">
          <ReceiptText :size="28" />
          <h3>{{ t('debts.noActivityTitle') }}</h3>
          <p>{{ t('debts.noActivityBody') }}</p>
        </div>

        <div v-else class="debt-timeline">
          <article v-for="entry in timeline" :key="entry.id" class="debt-timeline-row">
            <div class="debt-timeline-marker" :class="entry.type">
              <ReceiptText :size="17" />
            </div>
            <div>
              <strong>{{ t(`debts.entryTypes.${entry.type}`) }}</strong>
              <p>{{ entry.note }}</p>
              <small>{{ entry.authorName }} · {{ formatDate(entry.createdAt) }}</small>
            </div>
            <span v-if="entry.amount">{{ money.format(entry.amount) }}</span>
          </article>
        </div>
      </section>
    </section>
  </section>
</template>
