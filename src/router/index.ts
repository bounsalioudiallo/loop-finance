import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/debts' },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/join', name: 'join', component: () => import('@/views/JoinDebtView.vue') },
    { path: '/debts', name: 'debts', component: () => import('@/views/DebtsView.vue') },
    { path: '/debts/:spaceId', name: 'debt-space', component: () => import('@/views/DebtSpaceView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/debts' },
  ],
});
