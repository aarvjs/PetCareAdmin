export interface ActivityLog {
  id?: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetUid?: string;
  targetName?: string;
  targetRole?: string;
  details?: string;
  timestamp?: any;
}

export interface SecurityEvent {
  id?: string;
  eventType: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'ROLE_CHANGED' | 'STATUS_CHANGED' | 'SECURITY_ALERT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  actorEmail?: string;
  ipAddress?: string;
  timestamp?: any;
}

export async function logActivity(log: Omit<ActivityLog, 'timestamp'>) {
  // Silent UI logger for frontend preview phase (no Firestore backend calls)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Audit Log UI]', log);
  }
}

export async function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
  // Silent UI logger for frontend preview phase (no Firestore backend calls)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Security Event UI]', event);
  }
}
