import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import DebtsView from '@/views/DebtsView.vue';
import GoalsView from '@/views/GoalsView.vue';
import IncomeView from '@/views/IncomeView.vue';
import OnboardingView from '@/views/OnboardingView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView },
    { path: '/income/new', name: 'income-new', component: IncomeView },
    { path: '/goals', name: 'goals', component: GoalsView },
    { path: '/debts', name: 'debts', component: DebtsView },
  ],
});
