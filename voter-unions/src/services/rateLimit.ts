import AsyncStorage from '@react-native-async-storage/async-storage';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  blockDurationMs: number; // How long to block after exceeding limit
}

interface RateLimitAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
  },
};

const STORAGE_PREFIX = 'rate_limit_';

class RateLimiter {
  private async getStorageKey(action: string, identifier: string): Promise<string> {
    return `${STORAGE_PREFIX}${action}_${identifier}`;
  }

  private async getAttempts(action: string, identifier: string): Promise<RateLimitAttempt | null> {
    try {
      // Normalize identifier to prevent bypass via casing
      const normalizedId = identifier.toLowerCase().trim();
      const key = await this.getStorageKey(action, normalizedId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting rate limit attempts:', error);
      return null;
    }
  }

  private async setAttempts(
    action: string,
    identifier: string,
    attempts: RateLimitAttempt
  ): Promise<void> {
    try {
      // Normalize identifier to prevent bypass via casing
      const normalizedId = identifier.toLowerCase().trim();
      const key = await this.getStorageKey(action, normalizedId);
      await AsyncStorage.setItem(key, JSON.stringify(attempts));
    } catch (error) {
      console.error('Error setting rate limit attempts:', error);
    }
  }

  private async clearAttempts(action: string, identifier: string): Promise<void> {
    try {
      // Normalize identifier to prevent bypass via casing
      const normalizedId = identifier.toLowerCase().trim();
      const key = await this.getStorageKey(action, normalizedId);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing rate limit attempts:', error);
    }
  }

  /**
   * Check if an action is currently rate limited
   * @returns Object with isBlocked status and optional timeRemaining in ms
   */
  async checkRateLimit(
    action: string,
    identifier: string
  ): Promise<{ isBlocked: boolean; timeRemaining?: number; attemptsRemaining?: number }> {
    const config = RATE_LIMIT_CONFIGS[action];
    if (!config) {
      return { isBlocked: false };
    }

    const attempts = await this.getAttempts(action, identifier);
    const now = Date.now();

    // No previous attempts
    if (!attempts) {
      return { isBlocked: false, attemptsRemaining: config.maxAttempts };
    }

    // Check if currently blocked
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return {
        isBlocked: true,
        timeRemaining: attempts.blockedUntil - now,
      };
    }

    // Check if window has expired (reset attempts)
    if (now - attempts.firstAttempt > config.windowMs) {
      await this.clearAttempts(action, identifier);
      return { isBlocked: false, attemptsRemaining: config.maxAttempts };
    }

    // Within window but not blocked
    const attemptsRemaining = config.maxAttempts - attempts.count;
    return {
      isBlocked: false,
      attemptsRemaining: Math.max(0, attemptsRemaining),
    };
  }

  /**
   * Record a failed attempt
   * @returns Object with isBlocked status and optional timeRemaining in ms
   */
  async recordAttempt(
    action: string,
    identifier: string
  ): Promise<{ isBlocked: boolean; timeRemaining?: number }> {
    const config = RATE_LIMIT_CONFIGS[action];
    if (!config) {
      return { isBlocked: false };
    }

    const attempts = await this.getAttempts(action, identifier);
    const now = Date.now();

    if (!attempts || now - attempts.firstAttempt > config.windowMs) {
      // First attempt or window expired
      await this.setAttempts(action, identifier, {
        count: 1,
        firstAttempt: now,
      });
      return { isBlocked: false };
    }

    // Increment attempt count
    const newCount = attempts.count + 1;

    if (newCount >= config.maxAttempts) {
      // Block the user
      const blockedUntil = now + config.blockDurationMs;
      await this.setAttempts(action, identifier, {
        ...attempts,
        count: newCount,
        blockedUntil,
      });
      return {
        isBlocked: true,
        timeRemaining: config.blockDurationMs,
      };
    }

    // Update count but don't block
    await this.setAttempts(action, identifier, {
      ...attempts,
      count: newCount,
    });
    return { isBlocked: false };
  }

  /**
   * Clear rate limit for successful action (e.g., successful login)
   */
  async clearLimit(action: string, identifier: string): Promise<void> {
    await this.clearAttempts(action, identifier);
  }

  /**
   * Format time remaining into human-readable string
   */
  formatTimeRemaining(ms: number): string {
    const minutes = Math.ceil(ms / (60 * 1000));
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
}

export const rateLimiter = new RateLimiter();
