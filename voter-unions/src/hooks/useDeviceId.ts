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
      try {
        if (Platform.OS === 'web') {
          // Web: Use Web Crypto API
          if (typeof crypto === 'undefined' || !crypto.subtle) {
            // Fallback for environments without Web Crypto API
            return input; // Return unhashed for now
          }
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
      } catch (err) {
        console.warn('Hash function failed, using raw value:', err);
        return input; // Fallback to unhashed value
      }
    }

    async function getDeviceId() {
      try {
        setIsLoading(true);
        let rawDeviceId: string | null = null;

        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // Dynamically import expo-application only on native platforms
          try {
            const Application = await import('expo-application');
            
            if (Platform.OS === 'ios') {
              // iOS: Get ID for vendor (stable across app reinstalls)
              rawDeviceId = await Application.getIosIdForVendorAsync();
            } else {
              // Android: Get Android ID (stable across app reinstalls)
              rawDeviceId = Application.getAndroidId();
            }
          } catch (appErr) {
            console.warn('Failed to get native device ID:', appErr);
            // Fallback to timestamp-based ID
            rawDeviceId = `${Platform.OS}-${Date.now()}-${Math.random()}`;
          }
        } else {
          // Web or other platforms - generate a stable ID based on browser fingerprint
          const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
          const screenInfo = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '0x0';
          rawDeviceId = `web-${userAgent}-${screenInfo}`;
        }

        if (!rawDeviceId) {
          // Last resort fallback
          rawDeviceId = `fallback-${Date.now()}-${Math.random()}`;
        }

        // Hash the device ID with SHA256 for privacy
        const hashedDeviceId = await hashString(rawDeviceId);

        setDeviceId(hashedDeviceId);
        setError(null);
      } catch (err) {
        console.error('Error getting device ID:', err);
        // Set a fallback device ID so the app doesn't crash
        const fallbackId = `error-${Date.now()}-${Math.random()}`;
        setDeviceId(fallbackId);
        setError(err instanceof Error ? err : new Error('Unknown error'));
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
