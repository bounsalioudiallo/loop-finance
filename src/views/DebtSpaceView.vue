<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Check, Copy, KeyRound, LogOut, Plus, Share2, Trash2, X } from '@lucide/vue';
import { currencyFromCue, parseNotebookNote, type NotebookDirection } from '@/domain/debtNotebook';
import {
  addDebtSpaceEntry,
  deleteDebtSpaceEntry,
  refreshDebtSpaceInvite,
  updateDebtSpaceEntry,
  watchDebtSpace,
  watchDebtSpaceEntries,
  type DebtSpace,
  type DebtSpaceEntry,
} from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const space = ref<DebtSpace | null>(null);
const entries = ref<DebtSpaceEntry[]>([]);
const note = ref('');
const selectedDirection = ref<NotebookDirection | ''>('');
const isSaving = ref(false);
const error = ref('');
const shareStatus = ref('');
const inviteCode = ref('');
const inviteCodeExpiresAt = ref('');
const showInviteCode = ref(false);
const isPreparingCode = ref(false);
const selectedCurrency = ref('XAF');
const currencyWasChosen = ref(false);
const swipedEntryId = ref('');
const draggingEntryId = ref('');
const dragOffset = ref(0);
const deletingEntryId = ref('');
const editingEntry = ref<DebtSpaceEntry | null>(null);
const isEditing = ref(false);
const editForm = reactive({
  note: '',
  direction: 'neutral' as NotebookDirection,
  currency: 'XAF',
});
let unsubscribeSpace: (() => void) | undefined;
let unsubscribeEntries: (() => void) | undefined;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartOffset = 0;
let swipeMoved = false;
let suppressNextClick = false;

const spaceId = computed(() => String(route.params.spaceId || ''));
const interpretation = computed(() => parseNotebookNote(note.value));
const effectiveDirection = computed(() => selectedDirection.value || interpretation.value.direction);
const formattedInviteCode = computed(() => inviteCode.value
  ? `${inviteCode.value.slice(0, 3)} ${inviteCode.value.slice(3, 6)}`
  : '');

const directions: Array<{ value: Exclude<NotebookDirection, 'neutral'>; label: string }> = [
  { value: 'theyOweMe', label: 'Owes me' },
  { value: 'iOweThem', label: 'I owe them' },
  { value: 'theyPaidMe', label: 'Paid me' },
  { value: 'iPaidThem', label: 'I paid them' },
];
const currencies = ['XAF', 'USD', 'EUR', 'GBP'];

watch(
  () => [spaceId.value, auth.state.uid] as const,
  ([nextSpaceId, uid]) => {
    unsubscribeSpace?.();
    unsubscribeEntries?.();
    space.value = null;
    entries.value = [];

    if (!uid) {
      router.replace(`/login?redirect=${encodeURIComponent(route.fullPath)}`);
      return;
    }

    if (!nextSpaceId) return;
    inviteCode.value = sessionStorage.getItem(`loop-debt-invite-code-${nextSpaceId}`) || '';
    inviteCodeExpiresAt.value = sessionStorage.getItem(`loop-debt-invite-expiry-${nextSpaceId}`) || '';
    if (sessionStorage.getItem(`loop-debt-show-code-${nextSpaceId}`)) {
      showInviteCode.value = true;
      sessionStorage.removeItem(`loop-debt-show-code-${nextSpaceId}`);
    }
    unsubscribeSpace = watchDebtSpace(nextSpaceId, (nextSpace) => {
      space.value = nextSpace;
      if (nextSpace && !note.value.trim() && !currencyWasChosen.value) {
        selectedCurrency.value = nextSpace.currency || 'XAF';
      }
    });
    unsubscribeEntries = watchDebtSpaceEntries(nextSpaceId, (nextEntries) => {
      entries.value = [...nextEntries].reverse();
    });
  },
  { immediate: true },
);

watch(note, (value) => {
  if (!value.trim()) {
    selectedDirection.value = '';
    currencyWasChosen.value = false;
    selectedCurrency.value = space.value?.currency || 'XAF';
    return;
  }

  if (interpretation.value.currencyCue && !currencyWasChosen.value) {
    selectedCurrency.value = currencyFromCue(interpretation.value.currencyCue, space.value?.currency || 'XAF');
  }
});

onBeforeUnmount(() => {
  unsubscribeSpace?.();
  unsubscribeEntries?.();
});

const counterparty = computed(() => {
  if (!space.value) return 'Shared debt';
  const otherId = space.value.memberIds.find((memberId) => memberId !== auth.state.uid);
  return otherId
    ? space.value.memberProfiles?.[otherId]?.displayName || space.value.counterpartyName || 'Shared person'
    : space.value.counterpartyName || 'Shared person';
});

const hasJoined = computed(() => Boolean(space.value?.memberIds.some((memberId) => memberId !== auth.state.uid)));

const currentBalance = computed(() => {
  if (!space.value) return 0;
  const explicit = space.value.balanceByUser?.[auth.state.uid];
  if (typeof explicit === 'number') return explicit;
  return space.value.createdBy === auth.state.uid ? space.value.currentBalance : -space.value.currentBalance;
});

function formatMoney(amount: number, currency = space.value?.currency || 'XAF') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatSummaryAmount(amount: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

const balanceText = computed(() => {
  const amount = Math.abs(currentBalance.value);
  if (amount < 0.01) return 'You are settled';
  if (currentBalance.value > 0) return `${counterparty.value} owes you ${formatSummaryAmount(amount)}`;
  return `You owe ${counterparty.value} ${formatSummaryAmount(amount)}`;
});

function directionFromMyView(entry: DebtSpaceEntry): NotebookDirection {
  if (entry.authorId === auth.state.uid) return entry.direction;
  const inverse: Record<NotebookDirection, NotebookDirection> = {
    theyOweMe: 'iOweThem',
    iOweThem: 'theyOweMe',
    theyPaidMe: 'iPaidThem',
    iPaidThem: 'theyPaidMe',
    neutral: 'neutral',
  };
  return inverse[entry.direction];
}

function directionLabel(entry: DebtSpaceEntry) {
  const direction = directionFromMyView(entry);
  if (direction === 'theyOweMe') return `${counterparty.value} owes you`;
  if (direction === 'iOweThem') return `You owe ${counterparty.value}`;
  if (direction === 'theyPaidMe') return `${counterparty.value} paid you`;
  if (direction === 'iPaidThem') return `You paid ${counterparty.value}`;
  return entry.authorId === auth.state.uid ? 'Your note' : `${counterparty.value}'s note`;
}

function isSettledEntry(entry: DebtSpaceEntry) {
  return entry.direction === 'theyPaidMe' || entry.direction === 'iPaidThem';
}

function entryMoney(entry: DebtSpaceEntry) {
  if (!entry.amount) return '';
  return formatMoney(entry.amount, currencyFromCue(entry.currencyCue, space.value?.currency || 'XAF'));
}

function perspectiveResult(direction: NotebookDirection, amount: number | null) {
  if (!amount) return '';
  const formatted = formatSummaryAmount(amount);
  if (direction === 'theyOweMe') return `${counterparty.value} owes you ${formatted}`;
  if (direction === 'iOweThem') return `You owe ${counterparty.value} ${formatted}`;
  if (direction === 'theyPaidMe') return `${counterparty.value} paid you ${formatted}`;
  if (direction === 'iPaidThem') return `You paid ${counterparty.value} ${formatted}`;
  return '';
}

const composerResult = computed(() => perspectiveResult(effectiveDirection.value, interpretation.value.amount));
const editInterpretation = computed(() => parseNotebookNote(editForm.note));
const editAmount = computed(() => {
  if (editInterpretation.value.amount !== null) return editInterpretation.value.amount;
  if (editingEntry.value && editForm.note === editingEntry.value.note) return editingEntry.value.amount;
  return null;
});
const editResult = computed(() => perspectiveResult(editForm.direction, editAmount.value));

watch(
  () => editForm.note,
  () => {
    if (!editingEntry.value) return;
    if (editInterpretation.value.amount && editForm.direction === 'neutral') {
      editForm.direction = editInterpretation.value.direction;
    }
    if (editInterpretation.value.currencyCue) {
      editForm.currency = currencyFromCue(editInterpretation.value.currencyCue, editForm.currency);
    }
  },
);

function canDelete(entry: DebtSpaceEntry) {
  return entry.authorId === auth.state.uid;
}

function chooseCurrency(currency: string) {
  selectedCurrency.value = currency;
  currencyWasChosen.value = true;
}

function beginSwipe(entry: DebtSpaceEntry, event: PointerEvent) {
  if (!canDelete(entry)) return;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swipeStartOffset = swipedEntryId.value === entry.id ? -88 : 0;
  draggingEntryId.value = entry.id;
  dragOffset.value = swipeStartOffset;
  swipeMoved = false;
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function moveSwipe(entry: DebtSpaceEntry, event: PointerEvent) {
  if (draggingEntryId.value !== entry.id) return;
  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;
  if (Math.abs(deltaY) > Math.abs(deltaX) && !swipeMoved) return;
  if (Math.abs(deltaX) > 8) swipeMoved = true;
  if (!swipeMoved) return;
  event.preventDefault();
  dragOffset.value = Math.max(-88, Math.min(0, swipeStartOffset + deltaX));
}

function endSwipe(entry: DebtSpaceEntry, event: PointerEvent) {
  if (draggingEntryId.value !== entry.id) return;
  swipedEntryId.value = dragOffset.value <= -44 ? entry.id : '';
  suppressNextClick = swipeMoved;
  draggingEntryId.value = '';
  dragOffset.value = 0;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  window.setTimeout(() => {
    suppressNextClick = false;
  }, 0);
}

function entryTransform(entry: DebtSpaceEntry) {
  if (draggingEntryId.value === entry.id) return `translateX(${dragOffset.value}px)`;
  return swipedEntryId.value === entry.id ? 'translateX(-88px)' : 'translateX(0)';
}

function openEdit(entry: DebtSpaceEntry) {
  if (suppressNextClick || !canDelete(entry)) return;
  if (swipedEntryId.value === entry.id) {
    swipedEntryId.value = '';
    return;
  }

  editingEntry.value = entry;
  editForm.note = entry.note;
  editForm.direction = entry.direction;
  editForm.currency = currencyFromCue(entry.currencyCue, space.value?.currency || 'XAF');
}

async function saveEdit() {
  if (!space.value || !editingEntry.value || !editForm.note.trim()) return;
  isEditing.value = true;
  error.value = '';

  try {
    await updateDebtSpaceEntry(space.value.id, editingEntry.value.id, {
      note: editForm.note,
      amount: editAmount.value,
      direction: editAmount.value ? editForm.direction : 'neutral',
      reasonCue: editInterpretation.value.reasonCue,
      currencyCue: editForm.currency,
      confidence: editAmount.value ? 'high' : 'low',
    });
    editingEntry.value = null;
    shareStatus.value = 'Entry updated';
    window.setTimeout(() => {
      shareStatus.value = '';
    }, 1600);
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'The entry could not be updated.';
  } finally {
    isEditing.value = false;
  }
}

async function deleteEntry(entry: DebtSpaceEntry) {
  if (!space.value || !canDelete(entry)) return;
  deletingEntryId.value = entry.id;
  error.value = '';

  try {
    await deleteDebtSpaceEntry(space.value.id, entry.id);
    swipedEntryId.value = '';
    shareStatus.value = 'Entry deleted';
    window.setTimeout(() => {
      shareStatus.value = '';
    }, 1600);
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'The entry could not be deleted.';
  } finally {
    deletingEntryId.value = '';
  }
}

async function addNote() {
  if (!space.value || !note.value.trim()) return;
  isSaving.value = true;
  error.value = '';

  try {
    await addDebtSpaceEntry(space.value.id, {
      type: interpretation.value.amount ? 'money' : 'note',
      note: note.value,
      amount: interpretation.value.amount,
      direction: effectiveDirection.value,
      reasonCue: interpretation.value.reasonCue,
      currencyCue: selectedCurrency.value,
      confidence: interpretation.value.confidence,
    });
    note.value = '';
    selectedDirection.value = '';
  } catch (event) {
    error.value = event instanceof Error ? event.message : 'The note could not be added.';
  } finally {
    isSaving.value = false;
  }
}

async function openInviteCode() {
  const expiry = Date.parse(inviteCodeExpiresAt.value);
  if (inviteCode.value && (!Number.isFinite(expiry) || expiry <= Date.now())) {
    inviteCode.value = '';
    inviteCodeExpiresAt.value = '';
    sessionStorage.removeItem(`loop-debt-invite-code-${spaceId.value}`);
    sessionStorage.removeItem(`loop-debt-invite-expiry-${spaceId.value}`);
  }

  if (!inviteCode.value) {
    isPreparingCode.value = true;
    try {
      const response = await refreshDebtSpaceInvite(spaceId.value);
      inviteCode.value = response.inviteCode;
      inviteCodeExpiresAt.value = response.inviteCodeExpiresAt;
      sessionStorage.setItem(`loop-debt-invite-code-${spaceId.value}`, response.inviteCode);
      sessionStorage.setItem(`loop-debt-invite-expiry-${spaceId.value}`, response.inviteCodeExpiresAt);
    } catch (event) {
      shareStatus.value = event instanceof Error ? event.message : 'Could not create an invitation';
      return;
    } finally {
      isPreparingCode.value = false;
    }
  }
  showInviteCode.value = true;
}

async function copyInviteCode() {
  if (!inviteCode.value) return;
  try {
    await navigator.clipboard.writeText(inviteCode.value);
    shareStatus.value = 'Code copied';
  } catch {
    shareStatus.value = 'Could not copy the code';
  }
  window.setTimeout(() => {
    shareStatus.value = '';
  }, 1600);
}

async function shareInviteCode() {
  if (!inviteCode.value) return;
  const shareData = {
    title: `Shared debt with ${counterparty.value}`,
    text: `Open Loop Debts and enter code ${formattedInviteCode.value} to join my private shared debt. The code expires in 24 hours.`,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      shareStatus.value = 'Code shared';
    } else {
      await copyInviteCode();
      return;
    }
  } catch (event) {
    if (event instanceof Error && event.name === 'AbortError') return;
    shareStatus.value = 'Could not share the invitation';
  }

  window.setTimeout(() => {
    shareStatus.value = '';
  }, 1800);
}

async function logOut() {
  await auth.signOut();
  await router.replace('/login');
}
</script>

<template>
  <section v-if="!space" class="notebook-loading">
    <span class="loading-dot" />
    <p>Opening shared note…</p>
  </section>

  <section v-else class="shared-note-page">
    <header class="shared-note-header">
      <RouterLink class="back-button" to="/debts" aria-label="Back to shared debts">
        <ArrowLeft :size="21" />
      </RouterLink>
      <div class="shared-note-title">
        <h1>{{ counterparty }}</h1>
        <p>{{ hasJoined ? 'Shared with you' : 'Waiting for them to join' }}</p>
      </div>
      <button class="icon-action" type="button" aria-label="Log out" @click="logOut">
        <LogOut :size="19" />
      </button>
    </header>

    <div class="balance-sentence" :class="{ settled: Math.abs(currentBalance) < 0.01 }">
      <Check v-if="Math.abs(currentBalance) < 0.01" :size="18" />
      <span>{{ balanceText }}</span>
    </div>

    <form class="note-composer" @submit.prevent="addNote">
      <div class="composer-line">
        <textarea v-model="note" rows="1" placeholder="Write a debt note…" aria-label="Debt note" />
        <button type="submit" :disabled="isSaving || !note.trim()">
          <Plus :size="17" />
          <span>{{ isSaving ? 'Adding…' : 'Add' }}</span>
        </button>
      </div>

      <div v-if="interpretation.amount" class="direction-row compact" aria-label="What does this note mean?">
        <button
          v-for="direction in directions"
          :key="direction.value"
          type="button"
          :class="{ active: effectiveDirection === direction.value }"
          @click="selectedDirection = direction.value"
        >
          {{ direction.label }}
        </button>
      </div>
      <div v-if="interpretation.amount" class="currency-row compact" aria-label="Currency">
        <button
          v-for="currency in currencies"
          :key="currency"
          type="button"
          :class="{ active: selectedCurrency === currency }"
          @click="chooseCurrency(currency)"
        >
          {{ currency }}
        </button>
      </div>
      <p v-if="composerResult" class="entry-result-preview">{{ composerResult }}</p>
      <p v-if="error" class="form-error">{{ error }}</p>
    </form>

    <div class="shared-entries">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="swipe-entry-shell"
        :class="{ open: swipedEntryId === entry.id }"
      >
        <button
          v-if="canDelete(entry)"
          class="swipe-delete-action"
          type="button"
          :disabled="deletingEntryId === entry.id"
          @click.stop="deleteEntry(entry)"
        >
          <Trash2 :size="18" />
          <span>{{ deletingEntryId === entry.id ? 'Deleting…' : 'Delete' }}</span>
        </button>
        <article
          class="shared-entry"
          :class="{ paid: isSettledEntry(entry), editable: canDelete(entry), dragging: draggingEntryId === entry.id }"
          :style="{ transform: entryTransform(entry) }"
          @pointerdown="beginSwipe(entry, $event)"
          @pointermove="moveSwipe(entry, $event)"
          @pointerup="endSwipe(entry, $event)"
          @pointercancel="endSwipe(entry, $event)"
          @click="openEdit(entry)"
          @contextmenu.prevent
        >
          <div class="entry-copy">
            <p>{{ entry.note }}</p>
            <small>{{ directionLabel(entry) }}</small>
          </div>
          <strong v-if="entry.amount">{{ entryMoney(entry) }}</strong>
        </article>
      </div>

      <div v-if="!entries.length" class="empty-note">
        <p>This shared note is empty.</p>
        <span>Write the first debt exactly as you would in a notebook.</span>
      </div>
    </div>

    <footer class="shared-note-footer">
      <button v-if="!hasJoined" type="button" :disabled="isPreparingCode" @click="openInviteCode">
        <KeyRound :size="19" />
        <span>{{ isPreparingCode ? 'Creating code…' : 'Invite' }}</span>
      </button>
      <RouterLink to="/debts">All shared debts</RouterLink>
    </footer>

    <div v-if="showInviteCode" class="sheet-backdrop" @click.self="showInviteCode = false">
      <section class="invite-code-sheet">
        <header>
          <div>
            <span class="sheet-kicker">Invite {{ counterparty }}</span>
            <h2>Share this code</h2>
          </div>
          <button class="icon-action" type="button" aria-label="Close invitation code" @click="showInviteCode = false">
            <X :size="21" />
          </button>
        </header>

        <div class="large-invite-code">{{ formattedInviteCode }}</div>
        <p>They can open Loop Debts normally and enter this code. It works once and expires after 24 hours.</p>

        <div class="invite-code-actions">
          <button type="button" @click="copyInviteCode">
            <Copy :size="18" />
            Copy code
          </button>
          <button class="gold-button" type="button" @click="shareInviteCode">
            <Share2 :size="18" />
            Share
          </button>
        </div>
      </section>
    </div>

    <div v-if="editingEntry" class="sheet-backdrop" @click.self="editingEntry = null">
      <form class="edit-entry-sheet" @submit.prevent="saveEdit">
        <header>
          <div>
            <span class="sheet-kicker">Your entry</span>
            <h2>Edit debt</h2>
          </div>
          <button class="icon-action" type="button" aria-label="Close editor" @click="editingEntry = null">
            <X :size="21" />
          </button>
        </header>

        <label class="plain-field">
          <span>Note</span>
          <textarea v-model="editForm.note" rows="3" autofocus />
        </label>

        <div v-if="editAmount" class="direction-row" aria-label="What does this entry mean?">
          <button
            v-for="direction in directions"
            :key="direction.value"
            type="button"
            :class="{ active: editForm.direction === direction.value }"
            @click="editForm.direction = direction.value"
          >
            {{ direction.label }}
          </button>
        </div>

        <div v-if="editAmount" class="currency-row" aria-label="Currency">
          <button
            v-for="currency in currencies"
            :key="currency"
            type="button"
            :class="{ active: editForm.currency === currency }"
            @click="editForm.currency = currency"
          >
            {{ currency }}
          </button>
        </div>

        <p v-if="editResult" class="entry-result-preview">{{ editResult }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="gold-button" type="submit" :disabled="isEditing || !editForm.note.trim()">
          {{ isEditing ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
    </div>

    <p v-if="shareStatus" class="toast-message">{{ shareStatus }}</p>
  </section>
</template>
