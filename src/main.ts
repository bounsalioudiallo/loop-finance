import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './services/i18n';
import { router } from './router';
import './assets/styles.css';

createApp(App).use(router).use(i18n).mount('#app');
