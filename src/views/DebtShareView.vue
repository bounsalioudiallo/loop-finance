<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { CheckCircle2, Copy, FileSpreadsheet } from '@lucide/vue';
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

const workbookRows = computed(() => {
  if (!debt.value || !share.value) return [];

  return [
    [t('share.originalAmount'), money.value.format(debt.value.originalAmount), t('share.lender'), debt.value.lender],
    [t('share.remainingBalance'), money.value.format(debt.value.remainingAmount), t('share.progress'), `${progress.value}%`],
    [t('share.minimumPayment'), money.value.format(debt.value.minimumPayment), t('share.dueDay'), `${debt.value.dueDay}`],
    [t('share.interestRate'), `${debt.value.interestRate}%`, t('share.forecast'), `${payoffMonths.value} ${t('share.months')}`],
    [t('share.shareCreated'), new Date(share.value.createdAt).toLocaleDateString(locale.value), t('share.status'), share.value.acknowledgedAt ? t('share.acknowledged') : t('share.awaitingAck')],
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
        <FileSpreadsheet :size="26" />
        <div>
          <strong>{{ t('share.workbookTitle') }}</strong>
          <span>{{ debt.lender }} · {{ t('share.readOnly') }}</span>
        </div>
      </div>

      <button class="secondary-button" type="button" @click="copyLink">
        <Copy :size="18" />
        {{ copied ? t('share.copied') : t('share.copyLink') }}
      </button>
    </section>

    <section class="sheet-tabs" aria-label="Workbook tabs">
      <span class="active">{{ t('share.summaryTab') }}</span>
      <span>{{ t('share.paymentsTab') }}</span>
      <span>{{ t('share.notesTab') }}</span>
    </section>

    <section class="sheet-grid" aria-label="Debt share spreadsheet">
      <div class="sheet-corner" />
      <div v-for="letter in ['A', 'B', 'C', 'D']" :key="letter" class="sheet-column">{{ letter }}</div>

      <template v-for="(row, rowIndex) in workbookRows" :key="`summary-${rowIndex}`">
        <div class="sheet-row-number">{{ rowIndex + 1 }}</div>
        <div v-for="(cell, cellIndex) in row" :key="`${rowIndex}-${cellIndex}`" :class="['sheet-cell', { 'sheet-label': cellIndex % 2 === 0 }]">
          {{ cell }}
        </div>
      </template>

      <div class="sheet-row-number">6</div>
      <div class="sheet-section-cell">{{ t('share.paymentLedger') }}</div>
      <div class="sheet-section-cell" />
      <div class="sheet-section-cell" />
      <div class="sheet-section-cell" />

      <div class="sheet-row-number">7</div>
      <div class="sheet-header-cell">{{ t('share.date') }}</div>
      <div class="sheet-header-cell">{{ t('share.type') }}</div>
      <div class="sheet-header-cell">{{ t('share.amount') }}</div>
      <div class="sheet-header-cell">{{ t('share.balanceAfter') }}</div>

      <template v-for="(row, index) in paymentRows" :key="`payment-${index}`">
        <div class="sheet-row-number">{{ index + 8 }}</div>
        <div class="sheet-cell">{{ row.date }}</div>
        <div class="sheet-cell">{{ row.type }}</div>
        <div class="sheet-cell">{{ money.format(row.amount) }}</div>
        <div class="sheet-cell">{{ money.format(row.balance) }}</div>
      </template>
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
