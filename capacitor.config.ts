import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prediwin.app',
  appName: 'PrediWin',
  webDir: 'public',
  server: {
    url: 'https://prediwin.com',
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#7c3aed',
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      showSpinner: true,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#7c3aed'
    },
    App: {
      launchUrl: 'https://prediwin.com'
    }
  }
};

export default config;
