// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for @noble/curves package.json "exports" field compatibility
// Metro needs to prefer 'browser' builds which are React Native compatible
config.resolver.unstable_conditionNames = ['require', 'browser', 'react-native'];

module.exports = config;
