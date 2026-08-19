<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { ArrowRight, KeyRound, LogOut, Plus, Users, X } from '@lucide/vue';
import { currencyFromCue, parseNotebookNote, type NotebookDirection } from '@/domain/debtNotebook';
import {
  addDebtSpaceEntry,
  createDebtSpaceInvite,
  watchDebtSpaces,
  type DebtSpace,
} from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';

const auth = useAuthStore();
const router = useRouter();
const spaces = ref<DebtSpace[]>([]);
const showCreate = ref(false);
const isLoading = ref(false);
const error = ref('');
let unsubscribeSpaces: (() => void) | undefined;

const form = reactive({
  person: '',
  note: '',
  direction: '' as NotebookDirection | '',
  currency: 'XAF',
});

const interpretation = computed(() => parseNotebookNote(form.note));
const effectiveDirection = computed(() => form.direction || interpretation.value.direction);
const effectiveCurrency = computed(() => form.currency);

const directions: Array<{ value: Exclude<NotebookDirection, 'neutral'>; label: string }> = [
  { value: 'theyOweMe', label: 'Owes me' },
  { value: 'iOweThem', label: 'I owe them' },
  { value: 'theyPaidMe', label: 'Paid me' },
  { value: 'iPaidThem', label: 'I paid them' },
];
const currencies = ['XAF', 'USD', 'EUR', 'GBP'];

const resultText = computed(() => {
  const amount = interpretation.value.amount;
  const person = form.person.trim() || 'They';
  if (!amount) return '';
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);

  if (effectiveDirection.value === 'theyOweMe') return `${person} owes you ${formatted}`;
  if (effectiveDirection.value === 'iOweThem') return `You owe ${person} ${formatted}`;
  if (effectiveDirection.value === 'theyPaidMe') return `${person} paid you ${formatted}`;
  if (effectiveDirection.value === 'iPaidThem') return `You paid ${person} ${formatted}`;
  return '';
});

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

watch(
  () => form.note,
  (note) => {
    if (!note.trim()) form.direction = '';
    if (interpretation.value.currencyCue) {
      form.currency = currencyFromCue(interpretation.value.currencyCue, form.currency);
    }
  },
);

onBeforeUnmount(() => unsubscribeSpaces?.());

function otherPerson(space: DebtSpace) {
  const otherId = space.memberIds.find((memberId) => memberId !== auth.state.uid);
  return otherId
    ? space.memberProfiles?.[otherId]?.displayName || space.counterpartyName || 'Shared person'
    : space.counterpartyName || 'Shared person';
}

function balanceFor(space: DebtSpace) {
  const explicit = space.balanceByUser?.[auth.state.uid];
  if (typeof explicit === 'number') return explicit;
  return space.createdBy === auth.state.uid ? space.currentBalance : -space.currentBalance;
}

function formatSummaryAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function balanceLabel(space: DebtSpace) {
  const balance = balanceFor(space);
  if (Math.abs(balance) < 0.01) return 'Settled';
  if (balance > 0) return `${otherPerson(space)} owes you ${formatSummaryAmount(balance)}`;
  return `You owe ${otherPerson(space)} ${formatSummaryAmount(balance)}`;
}

async function createSpace() {
  if (!form.person.trim()) return;
  isLoading.value = true;
  error.value = '';

  try {
    const response = await createDebtSpaceInvite({
      counterpartyName: form.person.trim(),
      currency: effectiveCurrency.value,
    });

    if (form.note.trim()) {
      await addDebtSpaceEntry(response.spaceId, {
        type: interpretation.value.amount ? 'money' : 'note',
        note: form.note,
        amount: interpretation.value.amount,
        direction: effectiveDirection.value,
        reasonCue: interpretation.value.reasonCue,
        currencyCue: effectiveCurrency.value,
        confidence: interpretation.value.confidence,
      });
    }

    sessionStorage.setItem(`loop-debt-invite-code-${response.spaceId}`, response.inviteCode);
    sessionStorage.setItem(`loop-debt-invite-expiry-${response.spaceId}`, response.inviteCodeExpiresAt);
    sessionStorage.setItem(`loop-debt-show-code-${response.spaceId}`, '1');
    await router.push(`/debts/${response.spaceId}`);
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'The shared debt could not be created.';
  } finally {
    isLoading.value = false;
  }
}

async function logOut() {
  await auth.signOut();
  await router.replace('/login');
}
</script>

<template>
  <section v-if="!auth.state.isAuthenticated" class="signed-out-page">
    <span class="wordmark">Loop Debts</span>
    <h1>Your shared debts,<br />in one place.</h1>
    <p>Enter a code to join a private debt note, or log in to see your existing notes.</p>
    <RouterLink class="gold-button" to="/join">
      <span>Enter invitation code</span>
      <ArrowRight :size="18" />
    </RouterLink>
    <RouterLink class="quiet-link" to="/login">Log in</RouterLink>
  </section>

  <section v-else class="debts-home">
    <header class="app-header">
      <div>
        <span class="wordmark">Loop Debts</span>
        <p>{{ spaces.length ? `${spaces.length} shared ${spaces.length === 1 ? 'note' : 'notes'}` : 'Private shared notes' }}</p>
      </div>
      <div class="header-actions">
        <RouterLink class="icon-action" to="/join" aria-label="Join with a code">
          <KeyRound :size="20" />
        </RouterLink>
        <button class="icon-action" type="button" aria-label="Create a shared debt" @click="showCreate = true">
          <Plus :size="21" />
        </button>
        <button class="account-action" type="button" aria-label="Log out" @click="logOut">
          <span>{{ auth.initials.value }}</span>
          <LogOut :size="16" />
        </button>
      </div>
    </header>

    <div v-if="spaces.length" class="debt-list">
      <RouterLink class="join-code-banner" to="/join">
        <KeyRound :size="21" />
        <span>
          <strong>Enter invitation code</strong>
          <small>Join another shared debt</small>
        </span>
        <ArrowRight :size="18" />
      </RouterLink>

      <RouterLink v-for="space in spaces" :key="space.id" class="debt-list-row" :to="`/debts/${space.id}`">
        <span class="person-avatar">{{ otherPerson(space).slice(0, 1).toUpperCase() }}</span>
        <span class="debt-list-copy">
          <strong>{{ otherPerson(space) }}</strong>
          <small>{{ balanceLabel(space) }}</small>
        </span>
        <ArrowRight :size="18" />
      </RouterLink>
    </div>

    <div v-else class="empty-debts">
      <Users :size="28" />
      <h1>No shared debts yet</h1>
      <p>Enter the code someone shared with you, or start a private note.</p>
      <RouterLink class="gold-button" to="/join">
        <KeyRound :size="18" />
        <span>Enter invitation code</span>
      </RouterLink>
      <button class="empty-secondary-action" type="button" @click="showCreate = true">
        <Plus :size="18" />
        <span>Start a shared debt</span>
      </button>
    </div>

    <div v-if="showCreate" class="sheet-backdrop" @click.self="showCreate = false">
      <form class="create-sheet" @submit.prevent="createSpace">
        <header>
          <div>
            <span class="sheet-kicker">New shared debt</span>
            <h2>Who is this with?</h2>
          </div>
          <button class="icon-action" type="button" aria-label="Close" @click="showCreate = false">
            <X :size="21" />
          </button>
        </header>

        <label class="plain-field">
          <span>Person</span>
          <input v-model="form.person" autofocus placeholder="Fatou" type="text" required />
        </label>

        <label class="plain-field">
          <span>First note <small>optional</small></span>
          <textarea v-model="form.note" placeholder="Taxi 5,000 FCFA" rows="3" />
        </label>

        <div v-if="interpretation.amount" class="direction-row" aria-label="What does this note mean?">
          <button
            v-for="direction in directions"
            :key="direction.value"
            type="button"
            :class="{ active: effectiveDirection === direction.value }"
            @click="form.direction = direction.value"
          >
            {{ direction.label }}
          </button>
        </div>

        <div v-if="interpretation.amount" class="currency-row" aria-label="Currency">
          <button
            v-for="currency in currencies"
            :key="currency"
            type="button"
            :class="{ active: effectiveCurrency === currency }"
            @click="form.currency = currency"
          >
            {{ currency }}
          </button>
        </div>

        <p v-if="resultText" class="entry-result-preview">{{ resultText }}</p>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="gold-button" type="submit" :disabled="isLoading || !form.person.trim()">
          <span>{{ isLoading ? 'Creating…' : 'Create and invite' }}</span>
          <ArrowRight v-if="!isLoading" :size="18" />
        </button>
      </form>
    </div>
  </section>
</template>
