/**
 * Web Device Identification Service
 *
 * Provides stable device identification for web browsers using UUID + localStorage.
 * This is less reliable than hardware device IDs on native platforms, but provides
 * reasonable stability for web authentication.
 *
 * Behavior:
 * - First visit: Generate UUID and store in localStorage
 * - Subsequent visits: Retrieve stored UUID
 * - localStorage cleared: Generate new UUID (user must re-register)
 *
 * Security:
 * - UUID is random and unpredictable
 * - No tracking across browsers/devices
 * - Privacy-friendly (no fingerprinting)
 */

const DEVICE_ID_KEY = 'voter_unions_device_id';
const DEVICE_INFO_KEY = 'voter_unions_device_info';

/**
 * Generate a cryptographically secure UUID v4
 *
 * Uses Web Crypto API for secure randomness
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback to manual UUID v4 generation
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // Convert to UUID string format
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Get or create web device ID
 *
 * Returns existing UUID from localStorage, or generates and stores a new one
 *
 * @returns Device ID (UUID format)
 */
export function getWebDeviceId(): string {
  try {
    // Check if localStorage is available
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available, using temporary device ID');
      return 'temp-' + Date.now();
    }

    // Try to retrieve existing device ID
    const existingId = localStorage.getItem(DEVICE_ID_KEY);
    if (existingId) {
      return existingId;
    }

    // Generate new device ID
    const newId = generateUUID();

    // Store for future use
    localStorage.setItem(DEVICE_ID_KEY, newId);

    console.log('Generated new web device ID:', newId);
    return newId;
  } catch (error) {
    console.error('Failed to get/set device ID from localStorage:', error);
    // Fallback to temporary ID
    return 'temp-' + Date.now();
  }
}

/**
 * Get web device information
 *
 * Collects browser and platform metadata for backend tracking
 *
 * @returns Device info object
 */
export function getWebDeviceInfo(): {
  deviceId: string;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
} {
  const deviceId = getWebDeviceId();

  // Parse user agent for device info
  const userAgent = navigator.userAgent;
  let osName = 'Unknown';
  let deviceName = 'Web Browser';

  // Detect OS
  if (userAgent.includes('Windows')) {
    osName = 'Windows';
  } else if (userAgent.includes('Mac')) {
    osName = 'macOS';
  } else if (userAgent.includes('Linux')) {
    osName = 'Linux';
  } else if (userAgent.includes('Android')) {
    osName = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    osName = 'iOS';
  }

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    deviceName = 'Chrome Browser';
  } else if (userAgent.includes('Firefox')) {
    deviceName = 'Firefox Browser';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    deviceName = 'Safari Browser';
  } else if (userAgent.includes('Edg')) {
    deviceName = 'Edge Browser';
  }

  return {
    deviceId,
    deviceName,
    osName,
    osVersion: null, // Not easily available from user agent
  };
}

/**
 * Clear web device ID
 *
 * Removes device ID from localStorage. User will need to re-register.
 * Called during logout to remove device credentials.
 */
export function clearWebDeviceId(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEVICE_ID_KEY);
      localStorage.removeItem(DEVICE_INFO_KEY);
    }
  } catch (error) {
    console.error('Failed to clear device ID from localStorage:', error);
  }
}

/**
 * Check if web device has a stored ID
 *
 * @returns true if device ID exists in localStorage
 */
export function hasWebDeviceId(): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    return localStorage.getItem(DEVICE_ID_KEY) !== null;
  } catch (error) {
    console.error('Failed to check for device ID in localStorage:', error);
    return false;
  }
}
