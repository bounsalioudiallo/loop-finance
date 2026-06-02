import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';
import DebtsView from '@/views/DebtsView.vue';
import GoalsView from '@/views/GoalsView.vue';
import IncomeView from '@/views/IncomeView.vue';
import OnboardingView from '@/views/OnboardingView.vue';
import AllocationView from '@/views/AllocationView.vue';
import RulesView from '@/views/RulesView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/onboarding', name: 'onboarding', component: OnboardingView },
    { path: '/income/new', name: 'income-new', component: IncomeView },
    { path: '/allocate/:incomeId', name: 'allocate', component: AllocationView },
    { path: '/goals', name: 'goals', component: GoalsView },
    { path: '/debts', name: 'debts', component: DebtsView },
    { path: '/rules', name: 'rules', component: RulesView },
  ],
});
