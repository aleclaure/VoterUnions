import { supabase } from './supabase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface ActiveSession {
  id: string;
  user_id: string;
  session_token: string;
  device_id: string;
  device_name: string | null;
  device_type: string | null;
  os_name: string | null;
  os_version: string | null;
  app_version: string | null;
  ip_address: string | null;
  is_active: boolean;
  is_trusted: boolean;
  last_activity_at: string;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Session Management Service
 * Track active sessions, enable remote logout, manage trusted devices
 */

class SessionManagementService {
  /**
   * Create or update active session
   */
  async createSession(
    userId: string,
    sessionToken: string,
    deviceId: string
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      const { data, error } = await supabase.rpc('upsert_active_session', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_device_id: deviceId,
        p_device_name: deviceInfo.deviceName,
        p_device_type: deviceInfo.deviceType,
        p_os_name: deviceInfo.osName,
        p_os_version: deviceInfo.osVersion,
        p_app_version: deviceInfo.appVersion,
        p_ip_address: null, // IP not available in React Native
        p_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

      if (error) {
        console.error('Failed to create session:', error);
        return { success: false, error: error.message };
      }

      return { success: true, sessionId: data };
    } catch (error: any) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<ActiveSession[]> {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('last_activity_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch sessions:', error);
        return [];
      }

      return (data || []) as ActiveSession[];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Revoke a specific session (remote logout)
   */
  async revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('revoke_session', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('Failed to revoke session:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error revoking session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(
    userId: string,
    currentDeviceId: string
  ): Promise<{ success: boolean; revokedCount?: number; error?: string }> {
    try {
      const { data: sessions, error: fetchError } = await supabase
        .from('active_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('device_id', currentDeviceId)
        .is('deleted_at', null);

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      if (!sessions || sessions.length === 0) {
        return { success: true, revokedCount: 0 };
      }

      const sessionIds = sessions.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from('active_sessions')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .in('id', sessionIds);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, revokedCount: sessions.length };
    } catch (error: any) {
      console.error('Error revoking other sessions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('active_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Get device information for session tracking
   */
  private async getDeviceInfo(): Promise<{
    deviceName: string;
    deviceType: string;
    osName: string;
    osVersion: string;
    appVersion: string;
  }> {
    const deviceName = Device.deviceName || 'Unknown Device';
    const deviceType = Device.deviceType
      ? this.mapDeviceType(Device.deviceType)
      : 'unknown';
    const osName = Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web';
    const osVersion = Device.osVersion || 'Unknown';
    const appVersion = Application.nativeApplicationVersion || '1.0.0';

    return {
      deviceName,
      deviceType,
      osName,
      osVersion,
      appVersion,
    };
  }

  /**
   * Map Expo device type to readable string
   */
  private mapDeviceType(deviceType: Device.DeviceType): string {
    switch (deviceType) {
      case Device.DeviceType.PHONE:
        return 'mobile';
      case Device.DeviceType.TABLET:
        return 'tablet';
      case Device.DeviceType.DESKTOP:
        return 'desktop';
      case Device.DeviceType.TV:
        return 'tv';
      default:
        return 'unknown';
    }
  }

  /**
   * Get session count for user
   */
  async getSessionCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) {
        console.error('Error getting session count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }

  /**
   * Trust current device
   */
  async trustDevice(
    userId: string,
    deviceId: string,
    durationDays: number = 30
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const trustExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const { error } = await supabase.from('trusted_devices').upsert({
        user_id: userId,
        device_id: deviceId,
        device_name: deviceInfo.deviceName,
        trust_expires_at: trustExpiresAt.toISOString(),
        last_used_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_id', deviceId)
        .eq('is_revoked', false)
        .gt('trust_expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      // Update last used timestamp
      await supabase
        .from('trusted_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', data.id);

      return true;
    } catch (error) {
      return false;
    }
  }
}

export const sessionManager = new SessionManagementService();
