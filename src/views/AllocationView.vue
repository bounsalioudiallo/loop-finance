<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { AlertTriangle, CheckCircle2, Sparkles } from '@lucide/vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { explainAllocation, type AiReview } from '@/services/aiApi';
import { useFinanceStore } from '@/stores/financeStore';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const store = useFinanceStore();
const approved = ref(false);
const aiReview = ref<AiReview | null>(null);
const aiLoading = ref(false);
const aiError = ref('');

const incomeId = computed(() => String(route.params.incomeId));
const income = computed(() => store.getIncomeEvent(incomeId.value));
const plan = computed(() => store.previewAllocation(incomeId.value));

const money = computed(
  () =>
    new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: store.state.settings.currency,
    }),
);

function approve() {
  store.approveAllocation(incomeId.value);
  approved.value = true;
  window.setTimeout(() => router.push('/'), 800);
}

async function loadAiReview() {
  if (!plan.value) return;

  aiLoading.value = true;
  aiError.value = '';

  try {
    aiReview.value = await explainAllocation({
      plan: plan.value,
      locale: locale.value,
      context: {
        settings: store.state.settings,
        goals: store.state.goals,
        debts: store.state.debts,
        rules: store.state.rules,
      },
    });
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : t('allocation.ai.error');
  } finally {
    aiLoading.value = false;
  }
}

watch(
  () => incomeId.value,
  () => {
    aiReview.value = null;
    aiError.value = '';
    void loadAiReview();
  },
  { immediate: true },
);
</script>

<template>
  <AppPageHeader
    :title="income ? t('allocation.title', { amount: money.format(income.amount) }) : t('allocation.missing')"
    :subtitle="t('allocation.subtitle')"
    back-to="/income/new"
    show-back
  />

  <section v-if="plan" class="section-stack">
    <article class="panel">
      <h2>{{ t('allocation.plan') }}</h2>
      <div class="data-list">
        <div v-for="line in plan.lines" :key="line.id" class="allocation-row">
          <div class="allocation-heading">
            <strong>{{ line.label }}</strong>
            <span>{{ money.format(line.amount) }}</span>
          </div>
          <small class="muted">{{ line.explanation }}</small>
        </div>
      </div>
    </article>

    <article class="metrics-grid">
      <div class="metric">
        <span>{{ t('allocation.income') }}</span>
        <strong>{{ money.format(plan.incomeAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('dashboard.allocated') }}</span>
        <strong>{{ money.format(plan.allocatedAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('dashboard.remaining') }}</span>
        <strong>{{ money.format(plan.remainingAmount) }}</strong>
      </div>
      <div class="metric">
        <span>{{ t('allocation.mode') }}</span>
        <strong>{{ t(`modes.${store.state.settings.allocationMode}`) }}</strong>
      </div>
    </article>

    <article class="panel ai-review-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">{{ t('allocation.ai.eyebrow') }}</p>
          <h2>{{ t('allocation.ai.title') }}</h2>
        </div>
        <Sparkles :size="20" />
      </div>

      <div v-if="aiLoading" class="ai-review-loading">
        {{ t('allocation.ai.loading') }}
      </div>

      <div v-else-if="aiReview" class="ai-review-content">
        <section class="ai-review-summary">
          <h3>{{ t('allocation.ai.summary') }}</h3>
          <p>{{ aiReview.summary }}</p>
        </section>

        <div class="ai-review-grid">
          <section class="ai-review-section ai-review-positive">
            <div class="ai-review-section-heading">
              <CheckCircle2 :size="18" />
              <h3>{{ t('allocation.ai.whyItWorks') }}</h3>
            </div>
            <ul>
              <li v-for="item in aiReview.positives" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="ai-review-section ai-review-risk">
            <div class="ai-review-section-heading">
              <AlertTriangle :size="18" />
              <h3>{{ t('allocation.ai.watchOut') }}</h3>
            </div>
            <ul>
              <li v-for="item in aiReview.risks" :key="item">{{ item }}</li>
            </ul>
          </section>
        </div>

        <section class="ai-review-section ai-review-actions">
          <h3>{{ t('allocation.ai.suggestedActions') }}</h3>
          <ul>
            <li v-for="item in aiReview.suggestedActions" :key="item">{{ item }}</li>
          </ul>
        </section>

        <div class="ai-review-footer">
          <span>{{ t(`allocation.ai.confidence.${aiReview.confidence}`) }}</span>
          <small>{{ aiReview.disclaimer }}</small>
        </div>
      </div>

      <div v-else class="ai-review-empty">
        <p>{{ aiError || t('allocation.ai.empty') }}</p>
        <button class="secondary-button" type="button" :disabled="aiLoading" @click="loadAiReview">
          {{ t('allocation.ai.retry') }}
        </button>
      </div>
    </article>

    <div v-if="approved" class="notice">{{ t('allocation.approved') }}</div>

    <div class="actions">
      <button class="primary-button" type="button" @click="approve">
        {{ t('allocation.allocateNow') }}
      </button>
      <RouterLink class="secondary-button" to="/income/new">{{ t('actions.adjust') }}</RouterLink>
      <RouterLink class="secondary-button" to="/">{{ t('actions.remindLater') }}</RouterLink>
    </div>
  </section>
</template>
