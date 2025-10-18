import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to get a hashed device identifier for duplicate vote prevention
 * 
 * iOS: Uses getIosIdForVendorAsync() - unique per vendor, persists across reinstalls
 * Android: Uses getAndroidId() - unique per device, persists across reinstalls
 * Web: Uses browser fingerprint (user agent + screen dimensions)
 * 
 * The device ID is hashed with SHA256 for privacy before being stored
 */
export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function hashString(input: string): Promise<string> {
      if (Platform.OS === 'web') {
        // Web: Use Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Native: Use expo-crypto
        const Crypto = await import('expo-crypto');
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          input
        );
      }
    }

    async function getDeviceId() {
      try {
        setIsLoading(true);
        let rawDeviceId: string | null = null;

        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // Dynamically import expo-application only on native platforms
          const Application = await import('expo-application');
          
          if (Platform.OS === 'ios') {
            // iOS: Get ID for vendor (stable across app reinstalls)
            rawDeviceId = await Application.getIosIdForVendorAsync();
          } else {
            // Android: Get Android ID (stable across app reinstalls)
            rawDeviceId = Application.getAndroidId();
          }
        } else {
          // Web or other platforms - generate a stable ID based on browser fingerprint
          const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
          const screenInfo = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '0x0';
          rawDeviceId = `web-${userAgent}-${screenInfo}`;
        }

        if (!rawDeviceId) {
          throw new Error('Unable to get device identifier');
        }

        // Hash the device ID with SHA256 for privacy
        const hashedDeviceId = await hashString(rawDeviceId);

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
