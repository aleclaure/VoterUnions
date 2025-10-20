// CRITICAL: Crypto polyfill MUST be first import
import './src/setup/crypto-polyfill';

import { StatusBar } from 'expo-status-bar';
import DeviceAuthTest from './src/components/DeviceAuthTest';

export default function App() {
  return (
    <>
      <DeviceAuthTest />
      <StatusBar style="auto" />
    </>
  );
}
