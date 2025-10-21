// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for elliptic and other packages
config.resolver.unstable_conditionNames = ['require', 'browser', 'react-native'];

// Ignore Supabase functions (server-side Deno code) and expo-device/expo-application
// to prevent Snackager from trying to bundle them
config.resolver.blacklistRE = /supabase\/functions\/.*/;

module.exports = config;
