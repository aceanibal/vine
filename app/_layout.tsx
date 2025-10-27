// Import secure random source (BEFORE the shims)
import "react-native-get-random-values";

// Import the ethers shims (BEFORE importing ethers)
import "@ethersproject/shims";

import '../global.css';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useColorScheme, useInitialAndroidBarSync } from '~/lib/useColorScheme';
import { NAV_THEME } from '~/theme';
import { useEffect, useRef } from 'react';
import { useGlobalStore } from '~/lib/stores/useGlobalStore';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  useInitialAndroidBarSync();
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const currentWallet = useGlobalStore((s) => s.currentWallet);
  const checkWalletAuthorization = useGlobalStore((s) => s.checkWalletAuthorization);
  const fetchAppConfig = useGlobalStore((s) => s.fetchAppConfig);
  const refreshGoldPrice = useGlobalStore((s) => s.refreshGoldPrice);
  const refreshPriceHistory = useGlobalStore((s) => s.refreshPriceHistory);
  const hasCheckedRef = useRef(false);
  const hasLoadedConfigRef = useRef(false);
  const hasLoadedPriceRef = useRef(false);
  const hasLoadedHistoryRef = useRef(false);

  // Load app configuration on every app start
  useEffect(() => {
    if (hasLoadedConfigRef.current) return;
    hasLoadedConfigRef.current = true;
    fetchAppConfig().catch(() => {
      // Silently fail - app will use DEFAULT_APP_CONFIG
    });
  }, []);

  // Load gold price on every app start
  useEffect(() => {
    if (hasLoadedPriceRef.current) return;
    hasLoadedPriceRef.current = true;
    refreshGoldPrice().catch((error) => {
      console.error('Failed to load gold price on app startup:', error);
    });
  }, []);

  // Load price history on every app start
  useEffect(() => {
    if (hasLoadedHistoryRef.current) return;
    hasLoadedHistoryRef.current = true;
    refreshPriceHistory().catch((error) => {
      console.error('Failed to load price history on app startup:', error);
    });
  }, []);

  useEffect(() => {
    if (!currentWallet?.address) return;
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    checkWalletAuthorization().catch(() => {});
  }, [currentWallet?.address]);

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      {/* WRAP YOUR APP WITH ANY ADDITIONAL PROVIDERS HERE */}
      {/* <ExampleProvider> */}

      <NavThemeProvider value={NAV_THEME[colorScheme]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </NavThemeProvider>

      {/* </ExampleProvider> */}
    </>
  );
}


