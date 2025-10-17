import { supabase } from './supabase';

export type AuditActionType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'signup_success'
  | 'signup_failed'
  | 'password_reset_requested'
  | 'password_reset_success'
  | 'password_changed'
  | 'session_expired'
  | 'rate_limit_triggered'
  | 'vote_cast'
  | 'profile_updated';

export type AuditEntityType = 'user' | 'vote' | 'profile';

interface AuditLogParams {
  userId?: string | null;
  username?: string | null;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId: string | null;
  description?: string;
  metadata?: Record<string, any>;
  deviceId?: string | null;
  success?: boolean;
  errorMessage?: string;
}

export const logAuditEvent = async (params: AuditLogParams): Promise<void> => {
  try {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_user_id: params.userId || null,
      p_username: params.username || null,
      p_action_type: params.actionType,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_description: params.description || null,
      p_metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      p_device_id: params.deviceId || null,
      p_ip_address: null, // IP address not available in React Native
      p_success: params.success ?? true,
      p_error_message: params.errorMessage || null,
    });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};

// Helper functions for common audit events
export const auditHelpers = {
  loginSuccess: (userId: string, username: string, deviceId?: string | null) =>
    logAuditEvent({
      userId,
      username,
      actionType: 'login_success',
      entityType: 'user',
      entityId: userId,
      description: 'User logged in successfully',
      deviceId,
    }),

  loginFailed: (email: string, errorMessage: string, deviceId?: string | null) =>
    logAuditEvent({
      actionType: 'login_failed',
      entityType: 'user',
      entityId: null,
      description: `Failed login attempt for ${email}`,
      metadata: { email },
      errorMessage,
      success: false,
      deviceId,
    }),

  logout: (userId: string, username: string, deviceId?: string | null) =>
    logAuditEvent({
      userId,
      username,
      actionType: 'logout',
      entityType: 'user',
      entityId: userId,
      description: 'User logged out',
      deviceId,
    }),

  signupSuccess: (userId: string, email: string, deviceId?: string | null) =>
    logAuditEvent({
      userId,
      username: email,
      actionType: 'signup_success',
      entityType: 'user',
      entityId: userId,
      description: 'New account created',
      deviceId,
    }),

  signupFailed: (email: string, errorMessage: string, deviceId?: string | null) =>
    logAuditEvent({
      actionType: 'signup_failed',
      entityType: 'user',
      entityId: null,
      description: `Failed signup attempt for ${email}`,
      metadata: { email },
      errorMessage,
      success: false,
      deviceId,
    }),

  passwordChanged: (userId: string, username: string, deviceId?: string | null) =>
    logAuditEvent({
      userId,
      username,
      actionType: 'password_changed',
      entityType: 'user',
      entityId: userId,
      description: 'Password changed successfully',
      deviceId,
    }),

  passwordResetRequested: (email: string) =>
    logAuditEvent({
      actionType: 'password_reset_requested',
      entityType: 'user',
      entityId: null,
      description: `Password reset link requested for ${email}`,
      metadata: { email },
    }),

  sessionExpired: (userId: string, username: string, deviceId?: string | null) =>
    logAuditEvent({
      userId,
      username,
      actionType: 'session_expired',
      entityType: 'user',
      entityId: userId,
      description: 'Session expired due to inactivity',
      deviceId,
    }),

  rateLimitTriggered: (identifier: string, actionType: string, deviceId?: string | null) =>
    logAuditEvent({
      actionType: 'rate_limit_triggered',
      entityType: 'user',
      entityId: null,
      description: `Rate limit triggered for ${actionType}`,
      metadata: { identifier, triggeredAction: actionType },
      deviceId,
    }),
};
