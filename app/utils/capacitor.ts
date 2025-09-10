// Capacitor mobile app utilities
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';

export const isNativeMobile = () => {
  return Capacitor.isNativePlatform();
};

export const isPWA = () => {
  return Capacitor.getPlatform() === 'web' && window.matchMedia('(display-mode: standalone)').matches;
};

export const isMobileApp = () => {
  return isNativeMobile() || isPWA();
};

// Initialize mobile app features
export const initializeMobileApp = async () => {
  if (!isNativeMobile()) return;

  try {
    // Hide splash screen after app loads
    await SplashScreen.hide();

    // Set status bar style
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: StatusBarStyle.Default });
    }
    
    // Set status bar background color for Android
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#7c3aed' });
      await StatusBar.setStyle({ style: StatusBarStyle.Light });
    }

    console.log('✅ Mobile app initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing mobile app:', error);
  }
};

// Haptic feedback for button interactions
export const triggerHapticFeedback = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (!isNativeMobile()) return;
  
  try {
    await Haptics.impact({ style });
  } catch (error) {
    console.error('Haptics not available:', error);
  }
};

// Get device information
export const getDeviceInfo = async () => {
  try {
    const info = await Device.getInfo();
    return info;
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
};

// Network status monitoring
export const initializeNetworkMonitoring = () => {
  if (!isNativeMobile()) return;

  Network.addListener('networkStatusChange', status => {
    console.log('Network status changed:', status);
    
    if (!status.connected) {
      // Handle offline state
      console.log('📵 App is offline');
    } else {
      // Handle online state
      console.log('📶 App is back online');
    }
  });
};

// App state monitoring
export const initializeAppStateMonitoring = () => {
  if (!isNativeMobile()) return;

  App.addListener('appStateChange', ({ isActive }) => {
    console.log('App state changed. Active:', isActive);
    
    if (isActive) {
      // App became active - refresh data, check for updates
      console.log('📱 App became active');
    } else {
      // App went to background - save state, pause operations
      console.log('📱 App went to background');
    }
  });

  App.addListener('backButton', ({ canGoBack }) => {
    console.log('Hardware back button pressed. Can go back:', canGoBack);
    
    if (!canGoBack) {
      // If we can't go back, ask user if they want to exit
      // You can show a confirmation dialog here
      App.exitApp();
    }
  });
};

// Share functionality (for sharing prediction results, referral codes, etc.)
export const shareContent = async (title: string, text: string, url?: string) => {
  if (!isNativeMobile()) {
    // Fallback for web - use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return true;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    }
    return false;
  }

  // For native mobile apps, we'd use @capacitor/share plugin
  // npm install @capacitor/share
  return false;
};

// Initialize all mobile features
export const initializeMobileFeatures = async () => {
  await initializeMobileApp();
  initializeNetworkMonitoring();
  initializeAppStateMonitoring();
  
  const deviceInfo = await getDeviceInfo();
  if (deviceInfo) {
    console.log('📱 Device Info:', {
      platform: deviceInfo.platform,
      model: deviceInfo.model,
      osVersion: deviceInfo.osVersion,
      manufacturer: deviceInfo.manufacturer
    });
  }
};