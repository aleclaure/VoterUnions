import { useState, useEffect } from 'react';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Hook to get a hashed device identifier for duplicate vote prevention
 * 
 * iOS: Uses getIosIdForVendorAsync() - unique per vendor, persists across reinstalls
 * Android: Uses getAndroidId() - unique per device, persists across reinstalls
 * 
 * The device ID is hashed with SHA256 for privacy before being stored
 */
export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function getDeviceId() {
      try {
        setIsLoading(true);
        let rawDeviceId: string | null = null;

        if (Platform.OS === 'ios') {
          // iOS: Get ID for vendor (stable across app reinstalls)
          rawDeviceId = await Application.getIosIdForVendorAsync();
        } else if (Platform.OS === 'android') {
          // Android: Get Android ID (stable across app reinstalls)
          rawDeviceId = Application.getAndroidId();
        } else {
          // Web or other platforms - generate a stable ID based on browser fingerprint
          rawDeviceId = `web-${navigator.userAgent}-${screen.width}x${screen.height}`;
        }

        if (!rawDeviceId) {
          throw new Error('Unable to get device identifier');
        }

        // Hash the device ID with SHA256 for privacy
        // This ensures we can't reverse-engineer the actual device ID
        const hashedDeviceId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          rawDeviceId
        );

        setDeviceId(hashedDeviceId);
        setError(null);
      } catch (err) {
        console.error('Error getting device ID:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setDeviceId(null);
      } finally {
        setIsLoading(false);
      }
    }

    getDeviceId();
  }, []);

  return {
    deviceId,
    isLoading,
    error,
  };
}
