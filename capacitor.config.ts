import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loopfinance.app',
  appName: 'Loop Debts',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#fffdf8',
    },
  },
};

export default config;
