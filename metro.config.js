// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);

// Handle crypto polyfills for Expo Go
config.resolver.alias = {
  ...config.resolver.alias,
  crypto: 'react-native-get-random-values',
};

// Handle @noble/hashes crypto.js import issue
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add unstable_enablePackageExports to handle the @noble/hashes issue
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
