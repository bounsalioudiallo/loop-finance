<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Link2, ShieldCheck, Users } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { acceptDebtSpaceInvite } from '@/services/debtSpaceApi';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const auth = useAuthStore();
const isJoining = ref(false);
const error = ref('');
const spaceId = computed(() => String(route.params.spaceId || ''));
const inviteToken = computed(() => String(route.query.token || ''));
const redirectPath = computed(() => route.fullPath);

async function joinSpace() {
  if (!auth.state.isAuthenticated) {
    router.push(`/login?redirect=${encodeURIComponent(redirectPath.value)}`);
    return;
  }

  isJoining.value = true;
  error.value = '';

  try {
    await acceptDebtSpaceInvite({
      spaceId: spaceId.value,
      inviteToken: inviteToken.value,
    });
    router.push(`/debts/${spaceId.value}`);
  } catch (event) {
    error.value = event instanceof Error ? event.message : t('debts.inviteError');
  } finally {
    isJoining.value = false;
  }
}
</script>

<template>
  <section class="invite-screen">
    <div class="invite-mark">
      <Users :size="30" />
    </div>
    <p class="eyebrow">{{ t('debts.inviteEyebrow') }}</p>
    <h1>{{ t('debts.inviteTitle') }}</h1>
    <p>{{ t('debts.inviteBody') }}</p>

    <div class="invite-trust-row">
      <span>
        <ShieldCheck :size="17" />
        {{ t('debts.inviteSecure') }}
      </span>
      <span>
        <Link2 :size="17" />
        {{ t('debts.inviteScoped') }}
      </span>
    </div>

    <button class="primary-button" type="button" :disabled="isJoining || !inviteToken" @click="joinSpace">
      {{ isJoining ? t('auth.working') : auth.state.isAuthenticated ? t('debts.joinSpace') : t('auth.google') }}
    </button>
    <RouterLink class="secondary-button" to="/debts">{{ t('nav.back') }}</RouterLink>

    <p v-if="error" class="notice">{{ error }}</p>
    <p v-if="!inviteToken" class="notice">{{ t('debts.missingInviteToken') }}</p>
  </section>
</template>
