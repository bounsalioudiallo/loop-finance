<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { CheckCircle2, Copy, FileText } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { useFinanceStore } from '@/stores/financeStore';

const route = useRoute();
const { t, locale } = useI18n();
const store = useFinanceStore();
const noteDraft = ref('');
const copied = ref(false);

const shareId = computed(() => String(route.params.shareId));
const share = computed(() => store.getDebtShare(shareId.value));
const debt = computed(() => (share.value ? store.getDebt(share.value.debtId) : undefined));

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
  if (!debt.value || debt.value.minimumPayment <= 0) return 0;
  return Math.ceil(debt.value.remainingAmount / debt.value.minimumPayment);
});

const paymentRows = computed(() => {
  if (!debt.value) return [];

  const historicalPayment = Math.min(paidAmount.value, debt.value.minimumPayment);

  return [
    {
      date: new Date().toLocaleDateString(locale.value),
      type: t('share.historyRecorded'),
      amount: historicalPayment,
      balance: debt.value.remainingAmount,
      status: t('share.confirmed'),
    },
    ...Array.from({ length: Math.min(6, payoffMonths.value) }, (_, index) => {
      const paymentNumber = index + 1;
      const amount = Math.min(debt.value!.minimumPayment, Math.max(0, debt.value!.remainingAmount - debt.value!.minimumPayment * index));
      const balance = Math.max(0, debt.value!.remainingAmount - debt.value!.minimumPayment * paymentNumber);

      return {
        date: `${t('share.month')} ${paymentNumber}`,
        type: t('share.scheduled'),
        amount,
        balance,
        status: balance === 0 ? t('share.finalPayment') : t('share.planned'),
      };
    }),
  ];
});

const detailRows = computed(() => {
  if (!debt.value || !share.value) return [];

  return [
    { label: t('share.originalAmount'), value: money.value.format(debt.value.originalAmount) },
    { label: t('share.remainingBalance'), value: money.value.format(debt.value.remainingAmount) },
    { label: t('share.minimumPayment'), value: money.value.format(debt.value.minimumPayment) },
    { label: t('share.dueDay'), value: `${debt.value.dueDay}` },
    { label: t('share.interestRate'), value: `${debt.value.interestRate}%` },
    { label: t('share.forecast'), value: `${payoffMonths.value} ${t('share.months')}` },
    { label: t('share.shareCreated'), value: new Date(share.value.createdAt).toLocaleDateString(locale.value) },
    { label: t('share.status'), value: share.value.acknowledgedAt ? t('share.acknowledged') : t('share.awaitingAck') },
  ];
});

async function copyLink() {
  const url = window.location.href;
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

function saveNote() {
  if (!noteDraft.value.trim()) return;
  store.saveLenderNote(shareId.value, noteDraft.value.trim());
  noteDraft.value = '';
}
</script>

<template>
  <main v-if="debt && share" class="share-workbook">
    <section class="share-titlebar">
      <div class="share-file">
        <FileText :size="26" />
        <div>
          <strong>{{ t('share.statementTitle') }}</strong>
          <span>{{ debt.lender }} · {{ t('share.readOnly') }}</span>
        </div>
      </div>

      <button class="secondary-button" type="button" @click="copyLink">
        <Copy :size="18" />
        {{ copied ? t('share.copied') : t('share.copyLink') }}
      </button>
    </section>

    <section class="share-summary">
      <article class="share-balance-card">
        <span>{{ t('share.remainingBalance') }}</span>
        <strong>{{ money.format(debt.remainingAmount) }}</strong>
        <div class="progress">
          <span :style="{ display: 'block', width: `${progress}%` }" />
        </div>
        <small>{{ progress }}% {{ t('share.paidBack') }}</small>
      </article>

      <article class="share-mini-card">
        <span>{{ t('share.minimumPayment') }}</span>
        <strong>{{ money.format(debt.minimumPayment) }}</strong>
      </article>

      <article class="share-mini-card">
        <span>{{ t('share.forecast') }}</span>
        <strong>{{ payoffMonths }} {{ t('share.months') }}</strong>
      </article>
    </section>

    <section class="share-statement-panel">
      <div class="share-section-heading">
        <span>{{ t('share.summaryTab') }}</span>
        <strong>{{ debt.lender }}</strong>
      </div>

      <div class="share-detail-grid">
        <div v-for="row in detailRows" :key="row.label" class="share-detail-cell">
          <span>{{ row.label }}</span>
          <strong>{{ row.value }}</strong>
        </div>
      </div>
    </section>

    <section class="share-statement-panel">
      <div class="share-section-heading">
        <span>{{ t('share.paymentLedger') }}</span>
        <strong>{{ paymentRows.length }} {{ t('share.rows') }}</strong>
      </div>

      <div class="share-payment-list">
        <article v-for="(row, index) in paymentRows" :key="`${row.date}-${index}`" class="share-payment-row">
          <div>
            <strong>{{ row.type }}</strong>
            <span>{{ row.date }} · {{ row.status }}</span>
          </div>
          <div>
            <strong>{{ money.format(row.amount) }}</strong>
            <span>{{ t('share.balanceAfter') }} {{ money.format(row.balance) }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="share-actions-grid">
      <article class="panel">
        <h2>{{ t('share.lenderActions') }}</h2>
        <div class="actions">
          <button class="primary-button" type="button" @click="store.acknowledgeDebtShare(shareId)">
            <CheckCircle2 :size="18" />
            {{ share.acknowledgedAt ? t('share.acknowledged') : t('share.acknowledge') }}
          </button>
        </div>
      </article>

      <article class="panel">
        <h2>{{ t('share.lenderComment') }}</h2>
        <label>
          <span>{{ t('share.commentPlaceholder') }}</span>
          <input v-model="noteDraft" type="text" />
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
