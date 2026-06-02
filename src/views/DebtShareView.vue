<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Circle,
  Copy,
  FileText,
  MessageSquareText,
  WalletCards,
} from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { createDebtPaymentPlan } from '@/domain/finance';
import { useFinanceStore } from '@/stores/financeStore';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const store = useFinanceStore();
const noteDraft = ref('');
const copied = ref(false);

const shareId = computed(() => String(route.params.shareId));
const isOwnerPreview = computed(() => route.query.preview === 'owner');
const share = computed(() => store.getDebtShare(shareId.value));
const debt = computed(() => (share.value ? store.getDebt(share.value.debtId) : undefined));
const publicShareUrl = computed(() => {
  const origin = window.location.origin;
  return `${origin}/debt/share/${shareId.value}`;
});

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

const paidAmount = computed(() => {
  if (!debt.value) return 0;
  return Math.max(0, debt.value.originalAmount - debt.value.remainingAmount);
});

const progress = computed(() => {
  if (!debt.value) return 0;
  return Math.round((paidAmount.value / debt.value.originalAmount) * 100);
});

const payoffMonths = computed(() => {
  if (!debt.value) return 0;
  return paymentPlan.value?.monthsToPayoff || 0;
});

const paymentPlan = computed(() =>
  debt.value
    ? createDebtPaymentPlan(debt.value, { startDate: share.value?.createdAt, maxRows: 6 })
    : null,
);

const paymentRows = computed(() =>
  (paymentPlan.value?.rows || []).map((row) => ({
    date: new Date(row.dueDate).toLocaleDateString(locale.value),
    type: `${t('share.month')} ${row.month}`,
    amount: row.amount,
    balance: row.balanceAfter,
    status: row.isFinalPayment ? t('share.finalPayment') : t('share.planned'),
    confirmed: false,
  })),
);

const detailRows = computed(() => {
  if (!debt.value || !share.value) return [];

  return [
    { label: t('share.originalAmount'), value: money.value.format(debt.value.originalAmount) },
    { label: t('share.remainingBalance'), value: money.value.format(debt.value.remainingAmount), tone: 'strong' },
    { label: t('share.minimumPayment'), value: money.value.format(debt.value.minimumPayment), tone: 'money' },
    { label: t('share.firstPayment'), value: new Date(paymentPlan.value?.rows[0]?.dueDate || debt.value.firstPaymentDate || share.value.createdAt).toLocaleDateString(locale.value) },
    { label: t('share.frequency'), value: t(`debts.frequencies.${debt.value.paymentFrequency || 'monthly'}`) },
    { label: t('share.interestRate'), value: `${debt.value.interestRate}%` },
    { label: t('share.forecast'), value: `${payoffMonths.value} ${t('debts.installments')}`, tone: 'money' },
    { label: t('share.status'), value: share.value.acknowledgedAt ? t('share.confirmed') : t('share.pending'), tone: share.value.acknowledgedAt ? 'good' : 'warning' },
  ];
});

async function copyLink() {
  const url = publicShareUrl.value;
  copied.value = true;

  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt(t('share.copyFallback'), url);
  }

  window.setTimeout(() => {
    copied.value = false;
  }, 1600);
}

function goBackToDebt() {
  router.push('/debts');
}

function saveNote() {
  if (!noteDraft.value.trim()) return;
  store.saveLenderNote(shareId.value, noteDraft.value.trim());
  noteDraft.value = '';
}
</script>

<template>
  <main v-if="debt && share" class="share-workbook">
    <section v-if="isOwnerPreview" class="share-preview-bar">
      <button class="inline-back-button" type="button" :aria-label="t('share.backToDebt')" @click="goBackToDebt">
        <ArrowLeft :size="20" />
        <span>{{ t('nav.back') }}</span>
      </button>
      <button class="primary-button" type="button" @click="copyLink">
        <Copy :size="18" />
        {{ copied ? t('share.copied') : t('share.copyPublicLink') }}
      </button>
    </section>

    <section class="share-titlebar">
      <div class="share-file">
        <FileText :size="26" />
        <div>
          <strong>{{ t('share.statementTitle') }}</strong>
          <span>{{ debt.lender }} · {{ t('share.readOnly') }}</span>
        </div>
      </div>

      <button v-if="!isOwnerPreview" class="secondary-button" type="button" @click="copyLink">
        <Copy :size="18" />
        {{ copied ? t('share.copied') : t('share.copyLink') }}
      </button>
    </section>

    <section class="share-summary">
      <article class="share-balance-card">
        <div class="share-card-label">
          <WalletCards :size="18" />
          <span>{{ t('share.remainingBalance') }}</span>
        </div>
        <strong>{{ money.format(debt.remainingAmount) }}</strong>
        <div class="progress">
          <span :style="{ display: 'block', width: `${progress}%` }" />
        </div>
        <small>{{ progress }}% {{ t('share.paidBack') }}</small>
      </article>

      <article class="share-mini-card">
        <div class="share-card-label">
          <BadgeDollarSign :size="18" />
          <span>{{ t('share.minimumPayment') }}</span>
        </div>
        <strong>{{ money.format(debt.minimumPayment) }}</strong>
      </article>

      <article class="share-mini-card">
        <div class="share-card-label">
          <CalendarClock :size="18" />
          <span>{{ t('share.forecast') }}</span>
        </div>
        <strong>{{ payoffMonths }} {{ t('debts.installments') }}</strong>
      </article>
    </section>

    <section class="share-statement-panel">
      <div class="share-section-heading">
        <span>{{ t('share.summaryTab') }}</span>
        <strong>{{ debt.lender }}</strong>
      </div>

      <div class="share-detail-table">
        <div v-for="row in detailRows" :key="row.label" class="share-detail-row">
          <span>{{ row.label }}</span>
          <strong :class="row.tone ? `tone-${row.tone}` : undefined">{{ row.value }}</strong>
        </div>
      </div>
    </section>

    <section class="share-statement-panel share-ledger-panel">
      <div class="share-section-heading share-ledger-heading">
        <strong>{{ t('share.paymentLedger') }}</strong>
      </div>

      <div class="share-payment-list">
        <article v-for="(row, index) in paymentRows" :key="`${row.date}-${index}`" class="share-payment-row">
          <div class="share-payment-marker" :class="{ confirmed: row.confirmed }">
            <CheckCircle2 v-if="row.confirmed" :size="18" />
            <Circle v-else :size="18" />
          </div>
          <div class="share-payment-main">
            <div>
              <strong>{{ row.type }}</strong>
              <span>{{ row.date }}</span>
            </div>
            <span class="share-status-pill" :class="{ confirmed: row.confirmed }">{{ row.status }}</span>
          </div>
          <div class="share-payment-amount">
            <strong>{{ money.format(row.amount) }}</strong>
            <span>{{ t('share.balanceAfter') }} {{ money.format(row.balance) }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="share-actions-grid">
      <button
        class="share-check-action"
        :class="{ checked: share.acknowledgedAt }"
        type="button"
        @click="store.acknowledgeDebtShare(shareId)"
      >
        <CheckCircle2 :size="18" />
        <span>{{ share.acknowledgedAt ? t('share.acknowledged') : t('share.acknowledge') }}</span>
      </button>

      <article class="share-action-card">
        <div class="share-action-icon">
          <MessageSquareText :size="22" />
        </div>
        <div>
          <h2>{{ t('share.lenderComment') }}</h2>
          <p>{{ t('share.commentPlaceholder') }}</p>
        </div>
        <label>
          <span>{{ t('share.notesTab') }}</span>
          <textarea v-model="noteDraft" rows="3" />
        </label>
        <div class="actions" style="margin-top: 12px">
          <button class="secondary-button" type="button" @click="saveNote">{{ t('share.saveComment') }}</button>
        </div>
        <p v-if="share.lenderNote" class="notice" style="margin-top: 12px">{{ share.lenderNote }}</p>
      </article>
    </section>
  </main>

  <main v-else class="screen">
    <section class="page-header">
      <h1>{{ t('share.notFound') }}</h1>
      <p>{{ t('share.notFoundBody') }}</p>
    </section>
  </main>
</template>
