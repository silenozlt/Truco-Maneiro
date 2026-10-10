import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trucomineiro.app',
  appName: 'Truco Mineiro',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0a2e1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
