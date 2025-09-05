import * as NavigationBar from 'expo-navigation-bar';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';

import { COLORS } from '~/theme/colors';

function useColorScheme() {
  const { colorScheme, setColorScheme: setNativeWindColorScheme } = useNativewindColorScheme();

  const setColorScheme = React.useCallback(async (colorScheme: 'light' | 'dark') => {
    setNativeWindColorScheme(colorScheme);
    if (Platform.OS !== 'android') return;
    try {
      await setNavigationBar(colorScheme);
    } catch (error) {
      console.error('useColorScheme.tsx", "setColorScheme', error);
    }
  }, [setNativeWindColorScheme]);

  const toggleColorScheme = React.useCallback(() => {
    return setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
  }, [colorScheme, setColorScheme]);

  const currentColorScheme = colorScheme ?? 'light';
  const colors = React.useMemo(() => COLORS[currentColorScheme], [currentColorScheme]);

  return React.useMemo(() => ({
    colorScheme: currentColorScheme,
    isDarkColorScheme: currentColorScheme === 'dark',
    setColorScheme,
    toggleColorScheme,
    colors,
  }), [currentColorScheme, setColorScheme, toggleColorScheme, colors]);
}

/**
 * Set the Android navigation bar color based on the color scheme.
 */
function useInitialAndroidBarSync() {
  const { colorScheme } = useColorScheme();
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    setNavigationBar(colorScheme).catch((error) => {
      console.error('useColorScheme.tsx", "useInitialColorScheme', error);
    });
  }, [colorScheme]);
}

export { useColorScheme, useInitialAndroidBarSync };

function setNavigationBar(colorScheme: 'light' | 'dark') {
  return Promise.all([
    NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark'),
    NavigationBar.setPositionAsync('absolute'),
    NavigationBar.setBackgroundColorAsync(colorScheme === 'dark' ? '#00000030' : '#ffffff80'),
  ]);
}
