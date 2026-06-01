import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loopfinance.app',
  appName: 'Loop Finance',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#101820',
    },
  },
};

export default config;
