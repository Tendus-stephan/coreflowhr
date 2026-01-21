import { User, DashboardStats, Job, Candidate, Interview, ActivityItem, BillingPlan, Invoice, RecruitmentSettings, EmailTemplate, Integration, CandidateStage, Note, InterviewFeedback, EmailLog, EmailWorkflow, WorkflowExecution, Offer, OfferTemplate } from "../types";
import { supabase } from "./supabase";
import { getPlanLimits, hasFeature } from "./planLimits";

// Helper to get current user ID
const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// Test mode removed - all jobs and candidates are now production data

// Helper to generate a simple hash from string (for device fingerprinting)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Helper to parse user agent for device info
const parseUserAgent = () => {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  }

  // OS detection
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (userAgent.includes('iPhone')) {
    os = 'iOS';
    deviceType = 'mobile';
  } else if (userAgent.includes('iPad')) {
    os = 'iOS';
    deviceType = 'tablet';
  }

  // Device type detection
  if (/Mobile|Android|iPhone/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/iPad|Tablet/i.test(userAgent)) {
    deviceType = 'tablet';
  }

  // Generate device fingerprint from browser + OS + user agent
  const deviceFingerprint = simpleHash(`${browser}|${os}|${userAgent}`);

  return { browser, os, deviceType, userAgent, deviceFingerprint };
};

// Helper to track/create session in database
export const trackSession = async (): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const sessionToken = session.access_token;
    
    // Parse device info (includes device fingerprint)
    const { browser, os, deviceType, userAgent, deviceFingerprint } = parseUserAgent();
    const deviceName = `${browser} on ${os}`;

    // Build session data
    const sessionData = {
      user_id: userId,
      session_token: sessionToken,
      device_name: deviceName,
      device_type: deviceType,
      browser: browser,
      os: os,
      user_agent: userAgent,
      device_fingerprint: deviceFingerprint,
      ip_address: 'Unknown', // Would need backend to get real IP
      location: 'Unknown Location', // Would need geolocation API
      is_current: true,
      last_active_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    // First, try to find existing session by device fingerprint (same device/browser)
    const { data: existingSessionByFingerprint } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('device_fingerprint', deviceFingerprint)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSessionByFingerprint) {
      // Update existing session on same device (update session token in case it changed)
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          session_token: sessionToken, // Update token in case it changed
          last_active_at: new Date().toISOString(),
          is_current: true,
          device_name: deviceName,
          device_type: deviceType,
          browser: browser,
          os: os,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingSessionByFingerprint.id);

      if (updateError) {
        console.error('Error updating session by fingerprint:', updateError);
        // Fall through to try by session token
      } else {
        // Successfully updated, mark other sessions as not current
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', userId)
          .neq('id', existingSessionByFingerprint.id);
        return;
      }
    }

    // If no match by fingerprint, try by session token (for backward compatibility)
    const { data: existingSessionByToken } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingSessionByToken) {
      // Update existing session
      const { error: updateError } = await supabase
        .from('user_sessions')
        .update({
          device_fingerprint: deviceFingerprint, // Add fingerprint if missing
          last_active_at: new Date().toISOString(),
          is_current: true,
          device_name: deviceName,
          device_type: deviceType,
          browser: browser,
          os: os,
          user_agent: userAgent,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingSessionByToken.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        return;
      }
    } else {
      // Insert new session
      const { error: insertError } = await supabase
        .from('user_sessions')
        .insert(sessionData);

      if (insertError) {
        // If insert fails (e.g., 409 conflict), try to update instead
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('409')) {
          // Try updating by device fingerprint
          const { error: updateError } = await supabase
            .from('user_sessions')
            .update({
              session_token: sessionToken,
              last_active_at: new Date().toISOString(),
              is_current: true,
            })
            .eq('device_fingerprint', deviceFingerprint)
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating session after conflict:', updateError);
          }
        } else {
          console.error('Error inserting session:', {
            message: insertError?.message,
            details: insertError?.details,
            hint: insertError?.hint,
            code: insertError?.code,
            fullError: insertError
          });
        }
        return;
      }
    }

    // Mark all other sessions as not current
    await supabase
      .from('user_sessions')
      .update({ is_current: false })
      .eq('user_id', userId)
      .neq('session_token', sessionToken);
  } catch (error) {
    // Silently fail - session tracking is non-critical
    console.error('Error tracking session:', error);
  }
};

// Helper to format dates
const formatDate = (date: string | Date): string => {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
};

const formatTimeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
};

export interface Notification {
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    type: string;
    category?: string;
}

export interface Session {
    id: string;
    device: string;
    location: string;
    ip: string;
    time: string;
    icon: 'desktop' | 'mobile';
    current: boolean;
}

// --- API CLIENT ---

export const api = {
    auth: {
        me: async (): Promise<User> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const { data: { user } } = await supabase.auth.getUser();
            
            if (!profile && user) {
                // Create profile if it doesn't exist
                const { data: newProfile } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                    })
                    .select()
                    .single();

                if (newProfile) {
                    return {
                        id: userId,
                        name: newProfile.name || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                        role: newProfile.role || 'User',
                        phone: newProfile.phone || '',
                        jobTitle: newProfile.job_title || '',
                        avatar: newProfile.avatar_url,
                        notifications: {
                            email: newProfile.email_notifications ?? true,
                            push: newProfile.push_notifications ?? false,
                            weeklyReport: newProfile.weekly_report ?? true,
                        }
                    };
                }
            }

            return {
                id: userId,
                name: profile?.name || user?.email?.split('@')[0] || 'User',
                email: user?.email || '',
                role: profile?.role || 'User',
                phone: profile?.phone || '',
                jobTitle: profile?.job_title || '',
                avatar: profile?.avatar_url,
                notifications: {
                    email: profile?.email_notifications ?? true,
                    push: profile?.push_notifications ?? false,
                    weeklyReport: profile?.weekly_report ?? true,
                }
            };
        },
        updateProfile: async (data: Partial<User>): Promise<User> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.role) updateData.role = data.role;
            if (data.phone !== undefined) updateData.phone = data.phone;
            if (data.jobTitle !== undefined) updateData.job_title = data.jobTitle;
            // Handle avatar: can be string (URL), null (to clear), or undefined (no change)
            if (data.avatar !== undefined) updateData.avatar_url = data.avatar || null;
            if (data.notifications) {
                if (data.notifications.email !== undefined) updateData.email_notifications = data.notifications.email;
                if (data.notifications.push !== undefined) updateData.push_notifications = data.notifications.push;
                if (data.notifications.weeklyReport !== undefined) updateData.weekly_report = data.notifications.weeklyReport;
            }
            // Handle onboarding fields
            if ((data as any).onboarding_completed !== undefined) updateData.onboarding_completed = (data as any).onboarding_completed;
            if ((data as any).onboarding_completed_at !== undefined) updateData.onboarding_completed_at = (data as any).onboarding_completed_at;

            const { data: updated, error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();
            
            return {
                id: userId,
                name: updated.name || user?.email?.split('@')[0] || 'User',
                email: user?.email || '',
                role: updated.role || 'User',
                phone: updated.phone || '',
                jobTitle: updated.job_title || '',
                avatar: updated.avatar_url,
                notifications: {
                    email: updated.email_notifications ?? true,
                    push: updated.push_notifications ?? false,
                    weeklyReport: updated.weekly_report ?? true,
                }
            };
        },
        getSessions: async (): Promise<Session[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Always track current session first to ensure it's in the database
            await trackSession();

            const { data: sessions, error } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString())
                .order('last_active_at', { ascending: false });

            // If table doesn't exist yet (migration not run), return current session info as fallback
            if (error) {
                if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                    console.warn('user_sessions table not found. Run the migration in supabase/migration_security_tables.sql');
                    // Return current session info as fallback
                    const { data: { session: currentSession } } = await supabase.auth.getSession();
                    if (currentSession) {
                        const userAgent = navigator.userAgent;
                        const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Unknown';
                        const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Linux') ? 'Linux' : 'Unknown';
                        const isMobile = /Mobile|Android|iPhone/i.test(userAgent);

                        return [{
                            id: 'current',
                            device: `${browser} on ${os}`,
                            location: 'Current Location', 
                            ip: 'Current IP',
                            time: 'Active now', 
                            icon: isMobile ? 'mobile' as const : 'desktop' as const,
                            current: true,
                        }];
                    }
                    return [];
                } else {
                    throw error;
                }
            }

            // Also get current session from Supabase Auth
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const currentToken = currentSession?.access_token;

            const formattedSessions: Session[] = (sessions || []).map(s => ({
                id: s.id,
                device: s.device_name || `${s.browser || 'Unknown'} on ${s.os || 'Unknown'}`,
                location: s.location || 'Unknown Location',
                ip: s.ip_address || 'Unknown',
                time: formatTimeAgo(s.last_active_at),
                icon: s.device_type === 'mobile' ? 'mobile' as const : 'desktop' as const,
                current: s.session_token === currentToken || s.is_current,
            }));

            // If no sessions found in database, ensure current session is tracked and return it
            if (formattedSessions.length === 0 && currentSession) {
                // Make sure current session is tracked
                await trackSession();
                
                // Try to get sessions again after tracking
                const { data: retrySessions } = await supabase
                    .from('user_sessions')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('session_token', currentToken)
                    .maybeSingle();
                
                if (retrySessions) {
                    const { browser, os, deviceType } = parseUserAgent();
                    return [{
                        id: retrySessions.id,
                        device: retrySessions.device_name || `${browser} on ${os}`,
                        location: retrySessions.location || 'Current Location',
                        ip: retrySessions.ip_address || 'Current IP',
                        time: 'Active now',
                        icon: retrySessions.device_type === 'mobile' ? 'mobile' as const : 'desktop' as const,
                        current: true,
                    }];
                }
                
                // Last resort fallback
                const userAgent = navigator.userAgent;
                const browser = userAgent.includes('Chrome') ? 'Chrome' : userAgent.includes('Firefox') ? 'Firefox' : userAgent.includes('Safari') ? 'Safari' : 'Unknown';
                const os = userAgent.includes('Windows') ? 'Windows' : userAgent.includes('Mac') ? 'macOS' : userAgent.includes('Linux') ? 'Linux' : 'Unknown';
                const isMobile = /Mobile|Android|iPhone/i.test(userAgent);

                return [{
                    id: 'current',
                    device: `${browser} on ${os}`,
                    location: 'Current Location', 
                    ip: 'Current IP',
                    time: 'Active now', 
                    icon: isMobile ? 'mobile' as const : 'desktop' as const,
                    current: true,
                }];
            }

            return formattedSessions;
        },
        changePassword: async (currentPassword: string, newPassword: string): Promise<{ error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify current password by attempting to sign in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('User not found');

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                return { error: 'Current password is incorrect' };
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                // Simplify verbose password validation errors
                let errorMessage = updateError.message || 'Failed to update password';
                if (errorMessage.includes('Password should contain at least one character')) {
                    errorMessage = 'Password must contain uppercase, lowercase, numbers, and special characters';
                }
                return { error: errorMessage };
            }

            // Update password_changed_at timestamp
            await supabase
                .from('user_security_settings')
                .upsert({
                    user_id: userId,
                    password_changed_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            // Create notification for password change
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        title: 'Password Changed',
                        desc: 'Your account password has been successfully changed.',
                        type: 'password_changed',
                        category: 'system',
                        unread: true
                    });
            } catch (notifError) {
                console.error('Error creating password change notification:', notifError);
            }

            // Log activity
            try {
                const { logActivity } = await import('./activityLogger');
                await logActivity({
                    action: 'permission_updated',
                    target: 'Password'
                });
            } catch (error) {
                console.error('Error logging password change activity:', error);
            }

            return {};
        },
        getSecuritySettings: async (): Promise<{ twoFactorEnabled: boolean }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Try to get existing settings
            const { data, error } = await supabase
                .from('user_security_settings')
                .select('two_factor_enabled')
                .eq('user_id', userId)
                .maybeSingle(); // Returns null if no row exists instead of error

            // If table doesn't exist yet, return default values
            if (error) {
                if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
                    console.warn('user_security_settings table not found. Run the migration in supabase/migration_security_tables.sql');
                    return { twoFactorEnabled: false };
                }
                // For 406 (Not Acceptable) or 116 (No rows returned), row doesn't exist - create it
                if (error.code === 'PGRST406' || error.code === 'PGRST116' || error.message?.includes('406')) {
                    console.log('Security settings row not found for user, creating one...');
                    // Try to create the row
                    const { error: insertError } = await supabase
                        .from('user_security_settings')
                        .insert({
                            user_id: userId,
                            two_factor_enabled: false,
                        });
                    
                    if (insertError) {
                        console.error('Error creating security settings:', insertError);
                        // Even if insert fails, return default values
                        return { twoFactorEnabled: false };
                    }
                    
                    return { twoFactorEnabled: false };
                }
                // For other errors, log but return defaults
                console.error('Error fetching security settings:', error);
                return { twoFactorEnabled: false };
            }

            // If no row exists (data is null), create one and return defaults
            if (!data) {
                console.log('No security settings found, creating default row...');
                const { error: insertError } = await supabase
                    .from('user_security_settings')
                    .insert({
                        user_id: userId,
                        two_factor_enabled: false,
                    });
                
                if (insertError) {
                    console.error('Error creating security settings:', insertError);
                    // Even if insert fails, return default values
                    return { twoFactorEnabled: false };
                }
                
                return { twoFactorEnabled: false };
            }

            // Check actual MFA enrollment status from Supabase (source of truth)
            try {
                const { data: factors } = await supabase.auth.mfa.listFactors();
                const hasMFAFactor = factors?.totp && factors.totp.length > 0;
                
                // Sync database if MFA status differs
                if (hasMFAFactor !== (data?.two_factor_enabled ?? false)) {
                    await supabase
                        .from('user_security_settings')
                        .upsert({
                            user_id: userId,
                            two_factor_enabled: hasMFAFactor,
                        }, {
                            onConflict: 'user_id',
                        });
                }
                
                return {
                    twoFactorEnabled: hasMFAFactor,
                };
            } catch (mfaError) {
                // If MFA check fails, fall back to database value
                console.warn('Error checking MFA factors, using database value:', mfaError);
            return {
                twoFactorEnabled: data?.two_factor_enabled ?? false,
            };
            }
        },
        enableTwoFactor: async (): Promise<{ qrCode: string; secret: string; backupCodes: string[]; factorId?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // First check if a factor already exists
            const { data: existingFactors, error: listError } = await supabase.auth.mfa.listFactors();
            
            if (listError) {
                console.error('Error listing MFA factors:', listError);
                throw new Error('Failed to check existing 2FA setup. Please try again.');
            }

            // Check if factor with this name already exists
            const existingFactor = existingFactors?.totp?.find(
                (factor: any) => factor.friendly_name === 'Coreflow Authenticator'
            );

            if (existingFactor) {
                // Factor already exists - check if it's verified
                if (existingFactor.status === 'verified') {
                    throw new Error('2FA is already enabled and verified. Please disable it first if you want to reconfigure.');
                }

                // Factor exists but not verified - unenroll it first
                try {
                    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                        factorId: existingFactor.id,
                    });

                    if (unenrollError) {
                        console.error('Error unenrolling existing factor:', unenrollError);
                        throw new Error('An unverified 2FA factor already exists. Please try again or contact support.');
                    }
                } catch (unenrollErr: any) {
                    throw new Error(unenrollErr.message || 'Failed to reset existing 2FA setup. Please try again.');
                }
            }

            // Now enroll a new factor
            const { data: enrollData, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName: 'Coreflow Authenticator',
            });

            if (error) {
                // Handle specific error about existing factor
                if (error.message?.includes('already exists')) {
                    throw new Error('2FA setup already exists. Please disable it first or contact support to reset it.');
                }
                console.error('MFA enroll error:', error);
                throw new Error(error.message || 'Failed to enroll MFA factor');
            }

            if (!enrollData) {
                throw new Error('No data returned from MFA enrollment');
            }

            // Extract QR code and secret from response
            // Supabase returns: { id, type, totp: { qr_code, secret, uri } }
            const qrCode = enrollData.totp?.qr_code || '';
            const secret = enrollData.totp?.secret || '';

            if (!qrCode || !secret) {
                console.error('MFA enrollment response:', enrollData);
                throw new Error('Invalid response from MFA enrollment. QR code or secret missing.');
            }

            // Generate backup codes
            const backupCodes = Array.from({ length: 8 }, () => 
                Math.random().toString(36).substring(2, 8).toUpperCase()
            );

            // Store in security settings (create if doesn't exist)
            const { error: settingsError } = await supabase
                .from('user_security_settings')
                .upsert({
                    user_id: userId,
                    two_factor_enabled: false, // Will be set to true after verification
                    two_factor_secret: secret, // Store encrypted in production
                    two_factor_backup_codes: backupCodes,
                    two_factor_enabled_at: null, // Set after verification
                }, {
                    onConflict: 'user_id',
                });

            if (settingsError) {
                console.error('Error storing security settings:', settingsError);
                // Don't throw - MFA is enrolled, just settings storage failed
            }

            return {
                qrCode,
                secret,
                backupCodes,
                factorId: enrollData.id, // Return factor ID for verification
            };
        },
        verifyTwoFactor: async (code: string, factorId?: string): Promise<{ error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session');

            // Get MFA factors (with retry to wait for factor to be available)
            let factors;
            let factorsError;
            let retries = 0;
            const maxRetries = 5; // Increased retries

            do {
                const result = await supabase.auth.mfa.listFactors();
                factors = result.data;
                factorsError = result.error;
                
                // Check both totp array and all array for factors
                const totpFactors = factors?.totp || [];
                const allFactors = factors?.all || [];
                
                // If we have a factorId, check in both arrays
                if (factorId) {
                    const foundInTotp = totpFactors.find((f: any) => f.id === factorId);
                    const foundInAll = allFactors.find((f: any) => f.id === factorId && f.factor_type === 'totp');
                    if (foundInTotp || foundInAll) {
                        break;
                    }
                }
                
                // If we found any TOTP factor in totp array, break
                if (totpFactors.length > 0) {
                    break;
                }
                
                // If we found a TOTP factor in all array (unverified), also break
                const totpInAll = allFactors.find((f: any) => f.factor_type === 'totp');
                if (totpInAll) {
                    break;
                }
                
                // Wait a bit before retrying (give Supabase time to register the factor)
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
                }
                retries++;
            } while (retries < maxRetries);

            if (factorsError) {
                console.error('Error listing MFA factors:', factorsError);
                return { error: 'Failed to verify 2FA setup. Please try enabling it again.' };
            }

            // Check both totp array and all array for TOTP factors
            const totpFactors = factors?.totp || [];
            const allFactors = factors?.all || [];
            const totpInAll = allFactors.find((f: any) => f.factor_type === 'totp');

            if (totpFactors.length === 0 && !totpInAll) {
                console.error('No TOTP factors found after retries. Available factors:', factors);
                return { error: '2FA not properly set up. Please try enabling it again. If the problem persists, wait a few seconds and try again.' };
            }

            // Use provided factorId if available, otherwise use first factor
            let factor;
            if (factorId) {
                factor = totpFactors.find((f: any) => f.id === factorId) 
                    || allFactors.find((f: any) => f.id === factorId && f.factor_type === 'totp');
            }
            
            // If still no factor found, use first available TOTP factor
            if (!factor) {
                factor = totpFactors[0] || totpInAll;
            }

            // Challenge the factor
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: factor.id,
            });

            if (challengeError) throw challengeError;

            // Verify the code
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: factor.id,
                challengeId: challenge.id,
                code,
            });

            if (verifyError) {
                return { error: 'Invalid verification code. Please try again.' };
            }

            // Update security settings to mark 2FA as enabled
            await supabase
                .from('user_security_settings')
                .update({
                    two_factor_enabled: true,
                    two_factor_enabled_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            // Create notification for 2FA enabled
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        title: 'Two-Factor Authentication Enabled',
                        desc: 'Two-factor authentication has been successfully enabled on your account.',
                        type: '2fa_enabled',
                        category: 'system',
                        unread: true
                    });
            } catch (notifError) {
                console.error('Error creating 2FA enabled notification:', notifError);
            }

            // Log activity
            try {
                const { logActivity } = await import('./activityLogger');
                await logActivity({
                    action: 'automation_updated',
                    target: 'Two-Factor Authentication'
                });
            } catch (error) {
                console.error('Error logging 2FA enabled activity:', error);
            }

            return {};
        },
        disableTwoFactor: async (): Promise<{ error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get MFA factors
            const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

            if (factorsError) throw factorsError;

            // Unenroll all TOTP factors
            if (factors?.totp) {
                for (const factor of factors.totp) {
                    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
                        factorId: factor.id,
                    });

                    if (unenrollError) {
                        console.error('Error unenrolling factor:', unenrollError);
                    }
                }
            }

            // Update security settings
            await supabase
                .from('user_security_settings')
                .update({
                    two_factor_enabled: false,
                    two_factor_secret: null,
                    two_factor_backup_codes: null,
                })
                .eq('user_id', userId);

            // Create notification for 2FA disabled
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        title: 'Two-Factor Authentication Disabled',
                        desc: 'Two-factor authentication has been disabled on your account.',
                        type: '2fa_disabled',
                        category: 'system',
                        unread: true
                    });
            } catch (notifError) {
                console.error('Error creating 2FA disabled notification:', notifError);
            }

            // Log activity
            try {
                const { logActivity } = await import('./activityLogger');
                await logActivity({
                    action: 'automation_updated',
                    target: 'Two-Factor Authentication'
                });
            } catch (error) {
                console.error('Error logging 2FA disabled activity:', error);
            }

            return {};
        },
        revokeSession: async (sessionId: string): Promise<{ error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // If trying to revoke the fallback "current" session, sign out instead
            if (sessionId === 'current') {
                const { error: signOutError } = await supabase.auth.signOut();
                if (signOutError) {
                    return { error: signOutError.message || 'Failed to sign out' };
                }
                return {};
            }

            // Delete session from database
            const { error } = await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', userId);

            if (error) {
                // If session not found, might be a fallback session - try to sign out
                if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
                    return { error: 'Session not found in database. It may have already been revoked.' };
                }
                return { error: error.message || 'Failed to revoke session' };
            }

            return {};
        },
        revokeAllSessions: async (): Promise<{ error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Delete all sessions except current
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const currentToken = currentSession?.access_token;

            if (currentToken) {
                const { error } = await supabase
                    .from('user_sessions')
                    .delete()
                    .neq('session_token', currentToken)
                    .eq('user_id', userId);

                if (error) {
                    return { error: error.message || 'Failed to revoke sessions' };
                }
            } else {
                // If no current token, delete all
                const { error } = await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('user_id', userId);

                if (error) {
                    return { error: error.message || 'Failed to revoke sessions' };
                }
            }

            return {};
        }
    },
    dashboard: {
        getStats: async (): Promise<DashboardStats> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get all jobs (including closed) to filter candidates
            // Exclude test jobs: is_test = true OR title starts with [TEST]
            const [allJobsResult, candidatesResult, activityResult] = await Promise.all([
                supabase.from('jobs')
                    .select('id, status, created_at, posted_date, is_test, title')
                    .eq('user_id', userId),
                supabase.from('candidates')
                    .select('id, name, stage, job_id, applied_date, created_at, updated_at, is_test')
                    .eq('user_id', userId),
                supabase.from('activity_log')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('action', 'candidate_moved')
                    .like('target_to', '%Hired%')
                    .order('created_at', { ascending: false })
            ]);

            let allJobs = allJobsResult.data || [];
            let allCandidates = candidatesResult.data || [];
            const hiredActivityLog = activityResult.data || [];
            
            // Filter out test data: exclude jobs with is_test = true or [TEST] prefix, and candidates with is_test = true
            allJobs = allJobs.filter(j => !j.is_test && !j.title?.startsWith('[TEST]'));
            allCandidates = allCandidates.filter(c => !c.is_test);
            
            // Get IDs of closed jobs
            const closedJobIds = new Set(
                allJobs.filter(j => j.status === 'Closed').map(j => j.id)
            );
            
            // Filter candidates: exclude rejected candidates and candidates from closed jobs
            const candidates = allCandidates.filter(c => 
                c.stage !== 'Rejected' && !closedJobIds.has(c.job_id)
            );
            
            // Filter jobs: exclude closed jobs for active jobs count
            const jobs = allJobs.filter(j => j.status !== 'Closed');
            
            // Current period (this month)
            const now = new Date();
            const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            
            // Previous period (last month)
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            
            // Helper to check if date is in range
            const isInRange = (date: string | Date, start: Date, end: Date): boolean => {
                const d = typeof date === 'string' ? new Date(date) : date;
                if (isNaN(d.getTime())) return false;
                return d >= start && d <= end;
            };
            
            // Current period stats (all time) - exclude closed jobs
            const currentActiveJobs = jobs.filter(j => j.status === 'Active').length;
            const currentTotalCandidates = candidates.length;
            const currentQualifiedCandidates = candidates.filter(c => 
                ['Interview', 'Offer', 'Hired'].includes(c.stage)
            ).length;
            
            // Previous period stats (count items created in previous month)
            // For active jobs, count jobs created last month that are still active or were active
            const previousActiveJobs = jobs.filter(j => {
                const createdDate = j.created_at || j.posted_date;
                return isInRange(createdDate, lastMonthStart, lastMonthEnd);
            }).length;
            
            const previousTotalCandidates = candidates.filter(c => {
                const createdDate = c.created_at || c.applied_date;
                return isInRange(createdDate, lastMonthStart, lastMonthEnd);
            }).length;
            
            const previousQualifiedCandidates = candidates.filter(c => {
                const createdDate = c.created_at || c.applied_date;
                return isInRange(createdDate, lastMonthStart, lastMonthEnd) && 
                       ['Interview', 'Offer', 'Hired'].includes(c.stage);
            }).length;
            
            // Current period items (created this month)
            const currentMonthJobs = jobs.filter(j => {
                const createdDate = j.created_at || j.posted_date;
                return isInRange(createdDate, currentMonthStart, currentMonthEnd);
            }).length;
            
            const currentMonthCandidates = candidates.filter(c => {
                const createdDate = c.created_at || c.applied_date;
                return isInRange(createdDate, currentMonthStart, currentMonthEnd);
            }).length;
            
            const currentMonthQualifiedCandidates = candidates.filter(c => {
                const createdDate = c.created_at || c.applied_date;
                return isInRange(createdDate, currentMonthStart, currentMonthEnd) && 
                       ['Interview', 'Offer', 'Hired'].includes(c.stage);
            }).length;
            
            // Calculate trends (this month vs last month)
            const activeJobsTrend = previousActiveJobs > 0
                ? currentMonthJobs > previousActiveJobs
                    ? `+${currentMonthJobs - previousActiveJobs}`
                    : currentMonthJobs < previousActiveJobs
                    ? `${currentMonthJobs - previousActiveJobs}`
                    : '0'
                : currentMonthJobs > 0
                ? `+${currentMonthJobs}`
                : '0';
            
            const candidatesTrend = previousTotalCandidates > 0
                ? `${currentMonthCandidates > previousTotalCandidates ? '+' : ''}${Math.round(((currentMonthCandidates - previousTotalCandidates) / previousTotalCandidates) * 100)}%`
                : currentMonthCandidates > 0
                ? '+100%'
                : '0%';
            
            const qualifiedTrend = previousQualifiedCandidates > 0
                ? `${currentMonthQualifiedCandidates > previousQualifiedCandidates ? '+' : ''}${Math.round(((currentMonthQualifiedCandidates - previousQualifiedCandidates) / previousQualifiedCandidates) * 100)}%`
                : currentMonthQualifiedCandidates > 0
                ? '+100%'
                : '0%';
            
            // Calculate Average Time to Hire (in days)
            // Time to hire = days between when candidate was added/applied and when they were moved to "Hired" stage
            let avgTimeToFill = 0;
            let hiredCandidatesCount = 0;
            
            // Previous period time to hire for trend
            let previousAvgTimeToFill = 0;
            let previousHiredCandidatesCount = 0;
            
            // Find all hired candidates (already filtered to exclude rejected and closed job candidates)
            const hiredCandidates = candidates.filter(c => c.stage === 'Hired');
            
            for (const candidate of hiredCandidates) {
                // Get when candidate was added/applied
                const candidateEntryDate = candidate.applied_date 
                    ? new Date(candidate.applied_date) 
                    : new Date(candidate.created_at || 0);
                
                // Find when candidate was moved to "Hired" from activity log
                // Match by candidate name in the activity log target field
                const hiredActivity = hiredActivityLog.find((activity: any) => {
                    if (!activity.target_to || !activity.target_to.includes('Hired')) return false;
                    // Match by candidate name (activity.target contains candidate name)
                    return activity.target === candidate.name;
                });
                
                // Use activity log date if found, otherwise use candidate's updated_at as fallback
                const hiredDate = hiredActivity 
                    ? new Date(hiredActivity.created_at)
                    : candidate.updated_at 
                        ? new Date(candidate.updated_at)
                        : null;
                
                if (hiredDate && hiredDate > candidateEntryDate) {
                    // Calculate days difference
                    const daysDiff = Math.max(0, Math.ceil((hiredDate.getTime() - candidateEntryDate.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    if (daysDiff > 0) {
                        // Check if hired in current or previous period
                        const hiredInCurrent = isInRange(hiredDate, currentMonthStart, currentMonthEnd);
                        const hiredInPrevious = isInRange(hiredDate, lastMonthStart, lastMonthEnd);
                        
                        if (hiredInCurrent) {
                            avgTimeToFill += daysDiff;
                            hiredCandidatesCount++;
                        }
                        if (hiredInPrevious) {
                            previousAvgTimeToFill += daysDiff;
                            previousHiredCandidatesCount++;
                        }
                    }
                }
            }
            
            // Calculate averages
            if (hiredCandidatesCount > 0) {
                avgTimeToFill = Math.round(avgTimeToFill / hiredCandidatesCount);
            }
            if (previousHiredCandidatesCount > 0) {
                previousAvgTimeToFill = Math.round(previousAvgTimeToFill / previousHiredCandidatesCount);
            }
            
            // Format as "Xd" (e.g., "15d")
            const avgTimeToFillFormatted = avgTimeToFill > 0 ? `${avgTimeToFill}d` : '0d';
            
            // Calculate time to fill trend
            const timeToFillTrend = previousAvgTimeToFill > 0
                ? avgTimeToFill < previousAvgTimeToFill
                    ? `-${previousAvgTimeToFill - avgTimeToFill}d` // Improvement (lower is better)
                    : avgTimeToFill > previousAvgTimeToFill
                    ? `+${avgTimeToFill - previousAvgTimeToFill}d`
                    : '0d'
                : avgTimeToFill > 0
                ? '0d'
                : '0d';
            
            return {
                activeJobs: currentActiveJobs,
                totalCandidates: currentTotalCandidates,
                qualifiedCandidates: currentQualifiedCandidates,
                avgTimeToFill: avgTimeToFillFormatted, 
                activeJobsTrend,
                candidatesTrend,
                qualifiedTrend,
                timeToFillTrend
            };
        },
        getActivity: async (): Promise<ActivityItem[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('activity_log')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100); // Increased to get more stage movement data

            if (error) throw error;

            return (data || []).map(item => ({
                id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
                user: item.user_name,
                action: item.action,
                target: item.target,
                to: item.target_to,
                time: formatTimeAgo(item.created_at),
                createdAt: item.created_at // Add raw timestamp for flow graph
            }));
        }
    },
    notifications: {
        list: async (): Promise<Notification[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            return (data || []).map(notif => ({
                id: notif.id,
                title: notif.title,
                desc: notif.desc || '',
                time: formatTimeAgo(notif.created_at),
                unread: notif.unread ?? true,
                type: notif.type || 'system',
                category: notif.category || undefined
            }));
        },
        markRead: async (): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('notifications')
                .update({ unread: false })
                .eq('user_id', userId)
                .eq('unread', true);

            if (error) throw error;
        }
    },
    jobs: {
        list: async (filters?: { excludeClosed?: boolean; page?: number; pageSize?: number }): Promise<{ data: Job[]; total: number; page: number; pageSize: number; totalPages: number }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const page = filters?.page || 1;
            const pageSize = filters?.pageSize || 50; // Default 50 per page
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Build base query for count
            let countQuery = supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
            
            if (filters?.excludeClosed === true) {
                countQuery = countQuery.neq('status', 'Closed');
            }

            const { count, error: countError } = await countQuery;
            if (countError) throw countError;

            // Build data query with pagination
            let query = supabase
                .from('jobs')
                .select('*')
                .eq('user_id', userId);
            
            // Exclude closed jobs if requested (default is to include all)
            if (filters?.excludeClosed === true) {
                query = query.neq('status', 'Closed');
            }
            
            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, error } = await query;

            if (error) {
                // Log detailed error information for debugging
                console.error('Supabase error fetching jobs:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: error
                });
                throw error;
            }

            const jobs = (data || []).map((job: any) => ({
                id: job.id,
                title: job.title || '',
                department: job.department || 'General',
                location: job.location || '',
                type: job.type || 'Full-time',
                status: job.status || 'Draft',
                applicantsCount: job.applicants_count || 0,
                postedDate: job.posted_date || job.created_at || new Date().toISOString(),
                description: job.description || '',
                company: job.company,
                salaryRange: job.salary_range,
                experienceLevel: job.experience_level,
                remote: job.remote || false,
                skills: job.skills || [],
                isTest: job.is_test || false,
                scrapingStatus: job.scraping_status || null,
                scrapingError: job.scraping_error || null,
                scrapingAttemptedAt: job.scraping_attempted_at || null
            }));

            return {
                data: jobs,
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            };
        },
        get: async (id: string): Promise<Job | undefined> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error || !data) return undefined;

            return {
                id: data.id,
                title: data.title,
                department: data.department || 'General',
                location: data.location,
                type: data.type,
                status: data.status,
                applicantsCount: data.applicants_count || 0,
                postedDate: data.posted_date || data.created_at,
                description: data.description || '',
                company: data.company,
                salaryRange: data.salary_range,
                experienceLevel: data.experience_level,
                remote: data.remote || false,
                skills: data.skills || [],
                isTest: data.is_test || false,
                scrapingStatus: data.scraping_status || null,
                scrapingError: data.scraping_error || null,
                scrapingAttemptedAt: data.scraping_attempted_at || null
            };
        },
        create: async (jobData: Partial<Job>) => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Determine status - if not provided, default to 'Draft' for safety
            // Status should always be explicitly set by the caller
            const jobStatus = jobData.status || 'Draft';
            
            // Check active jobs limit if activating the job
            if (jobStatus === 'Active') {
                const { getPlanLimits } = await import('./planLimits');
                
                // Get user's plan
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('billing_plan_name')
                    .eq('user_id', userId)
                    .single();
                
                const planName = settings?.billing_plan_name || 'Basic Plan';
                const limits = getPlanLimits(planName);
                
                // Get current active jobs count
                const { count: activeJobsCount } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'Active');
                
                const currentActiveJobs = activeJobsCount ?? 0;
                const maxActiveJobs = limits.maxActiveJobs;
                
                if (currentActiveJobs >= maxActiveJobs) {
                    throw new Error(`Your ${limits.name} plan allows up to ${limits.maxActiveJobs} active jobs. Please close or archive existing jobs before creating new active ones, or upgrade your plan.`);
                }
            }
            
            const postedDate = jobStatus === 'Active' ? new Date().toISOString() : null;

            // Production mode - use job title as provided
            const jobTitle = jobData.title || 'Untitled';

            const { data: job, error: jobError } = await supabase
                .from('jobs')
                .insert({
                    user_id: userId,
                title: jobTitle,
                    department: jobData.department || 'General',
                location: jobData.location || 'Remote',
                type: jobData.type || 'Full-time',
                status: jobStatus,
                description: jobData.description || '',
                    company: jobData.company,
                    salary_range: jobData.salaryRange,
                    experience_level: jobData.experienceLevel,
                    remote: jobData.remote || false,
                    skills: jobData.skills || [],
                    posted_date: postedDate,
                    is_test: false // Production mode - always false
                })
                .select()
                .single();

            if (jobError) throw jobError;

            // Log activity
            const { logJobCreated } = await import('./activityLogger');
            await logJobCreated(job.title);

            return {
                id: job.id,
                title: job.title,
                department: job.department || 'General',
                location: job.location,
                type: job.type,
                status: job.status,
                applicantsCount: job.applicants_count || 0,
                postedDate: job.posted_date || job.created_at,
                description: job.description || '',
                company: job.company,
                salaryRange: job.salary_range,
                experienceLevel: job.experience_level,
                remote: job.remote || false,
                skills: job.skills || [],
                isTest: job.is_test || false
            };
        },
        update: async (id: string, jobData: Partial<Job>) => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (jobData.title) updateData.title = jobData.title;
            if (jobData.department) updateData.department = jobData.department;
            if (jobData.location) updateData.location = jobData.location;
            if (jobData.type) updateData.type = jobData.type;
            if (jobData.status) updateData.status = jobData.status;
            if (jobData.description !== undefined) updateData.description = jobData.description;
            if (jobData.company !== undefined) updateData.company = jobData.company;
            if (jobData.salaryRange !== undefined) updateData.salary_range = jobData.salaryRange;
            if (jobData.experienceLevel !== undefined) updateData.experience_level = jobData.experienceLevel;
            if (jobData.remote !== undefined) updateData.remote = jobData.remote;
            if (jobData.skills !== undefined) updateData.skills = jobData.skills;

            // Get old job data to check status changes
            let oldStatus: string | undefined;
            let jobTitle: string | undefined;
            let oldPostedDate: string | null | undefined;
            if (updateData.status !== undefined) {
                const { data: oldJob } = await supabase
                    .from('jobs')
                    .select('status, title, posted_date')
                    .eq('id', id)
                    .eq('user_id', userId)
                    .single();
                if (oldJob) {
                    oldStatus = oldJob.status;
                    jobTitle = oldJob.title;
                    oldPostedDate = oldJob.posted_date;
                }
            }

            // If status is being changed to Active, check active jobs limit
            if (updateData.status === 'Active' && oldStatus !== 'Active') {
                const { getPlanLimits } = await import('./planLimits');
                
                // Get user's plan
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('billing_plan_name')
                    .eq('user_id', userId)
                    .single();
                
                const planName = settings?.billing_plan_name || 'Basic Plan';
                const limits = getPlanLimits(planName);
                
                // Get current active jobs count (excluding the current job being updated)
                const { count: activeJobsCount } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .eq('status', 'Active')
                    .neq('id', id); // Exclude current job
                
                const currentActiveJobs = (activeJobsCount ?? 0) + 1; // +1 for the job being activated
                const maxActiveJobs = limits.maxActiveJobs;
                
                if (currentActiveJobs > maxActiveJobs) {
                    throw new Error(`Your ${limits.name} plan allows up to ${limits.maxActiveJobs} active jobs. Please close or archive existing jobs before activating this one, or upgrade your plan.`);
                }
                
                // Set posted_date if not set
                if (!oldPostedDate) {
                    updateData.posted_date = new Date().toISOString();
                }
            }

            const { data, error } = await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log activity for status changes
            if (updateData.status && oldStatus && oldStatus !== data.status && jobTitle) {
                try {
                    const { logJobPublished, logJobUnpublished, logJobClosed } = await import('./activityLogger');
                    if (data.status === 'Active' && oldStatus !== 'Active') {
                        await logJobPublished(jobTitle);
                        // Note: Candidate sourcing should be handled by the frontend when explicitly activating a draft job
                    } else if (data.status === 'Closed' && oldStatus !== 'Closed') {
                        await logJobClosed(jobTitle);
                    } else if (data.status !== 'Active' && oldStatus === 'Active') {
                        await logJobUnpublished(jobTitle);
                    }
                } catch (error) {
                    console.error('Error logging job status change:', error);
                }
            }
            
            // Log activity for job edits (if status didn't change)
            if (!updateData.status && Object.keys(updateData).length > 0) {
                try {
                    const { logJobEdited } = await import('./activityLogger');
                    await logJobEdited(data.title);
                } catch (error) {
                    console.error('Error logging job edit:', error);
                }
            }

            return {
                id: data.id,
                title: data.title,
                department: data.department || 'General',
                location: data.location,
                type: data.type,
                status: data.status,
                applicantsCount: data.applicants_count || 0,
                postedDate: data.posted_date || data.created_at,
                description: data.description || '',
                company: data.company,
                salaryRange: data.salary_range,
                experienceLevel: data.experience_level,
                remote: data.remote || false,
                skills: data.skills || [],
                workExperience: data.work_experience || [],
                projects: data.projects || [],
                portfolioUrls: data.portfolio_urls || {}
            };
        },
        delete: async (id: string) => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get job title before deleting for activity log
            const { data: jobData } = await supabase
                .from('jobs')
                .select('title')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            if (error) throw error;

            // Log job deletion activity
            if (jobData) {
                try {
                    const { logJobDeleted } = await import('./activityLogger');
                    await logJobDeleted(jobData.title);
                } catch (logError) {
                    console.error('Error logging job deletion:', logError);
                }
            }
        }
    },
    candidates: {
        create: async (jobId: string, candidateData: {
            name: string;
            email: string;
            role: string;
            location: string;
            experience: number;
            skills: string[];
            resumeSummary: string;
            aiMatchScore: number;
            stage?: 'New' | 'Screening';
        }): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // All newly sourced candidates go to "New" stage
            // They will receive a screening email automatically and can then upload CV to move to Screening
            const stage = 'New';

            // Production mode - no test data

            // Calculate basic match score from skills if available
            let calculatedScore: number | null = null;
            if (candidateData.skills && candidateData.skills.length > 0) {
                try {
                    // Get job to access job skills
                    const { data: job } = await supabase
                        .from('jobs')
                        .select('skills')
                        .eq('id', jobId)
                        .single();
                    
                    if (job && job.skills && job.skills.length > 0) {
                        const { calculateBasicMatchScore } = await import('./cvParser');
                        const matchResult = calculateBasicMatchScore(candidateData.skills, job.skills);
                        calculatedScore = matchResult.score;
                    }
                } catch (error) {
                    console.error('Error calculating initial match score:', error);
                    // Continue without score if calculation fails
                }
            }

            const { data: createdCandidate, error } = await supabase
                .from('candidates')
                .insert({
                    user_id: userId,
                    job_id: jobId,
                    name: candidateData.name,
                    email: candidateData.email,
                    role: candidateData.role,
                    location: candidateData.location,
                    experience: candidateData.experience,
                    skills: candidateData.skills,
                    resume_summary: candidateData.resumeSummary,
                    ai_match_score: calculatedScore, // Calculate basic score from skills even without CV
                    ai_analysis: candidateData.resumeSummary,
                    stage: stage,
                    source: 'ai_sourced',
                    is_test: false, // Production mode - always false
                    applied_date: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            
            // Log activity for candidate creation
            try {
                const { logCandidateAdded } = await import('./activityLogger');
                await logCandidateAdded(candidateData.name);
            } catch (logError) {
                console.error('Error logging candidate creation:', logError);
            }

            // Note: Automatic "New" stage workflow execution is disabled
            // Emails are now sent manually or when candidates move to other stages
        },
        apply: async (jobId: string, applicationData: {
            name: string;
            email: string;
            phone?: string;
            coverLetter?: string;
            cvFile: File;
        }): Promise<{ success: boolean; message?: string; isUpdate?: boolean; candidateId?: string }> => {
            try {
                // Normalize email
                const normalizedEmail = applicationData.email.toLowerCase().trim();

                // First, get the job to find the user_id, title, location, description
                const { data: job, error: jobError } = await supabase
                    .from('jobs')
                    .select('user_id, title, skills, location, description')
                    .eq('id', jobId)
                    .eq('status', 'Active')
                    .single();

                if (jobError || !job) {
                    throw new Error('Job not found or is no longer accepting applications');
                }

                // Check for duplicate candidate by email
                const { data: existingCandidate } = await supabase
                    .from('candidates')
                    .select('id, name, applied_date')
                    .eq('job_id', jobId)
                    .eq('email', normalizedEmail)
                    .maybeSingle();

                // Upload CV to storage
                const fileExt = applicationData.cvFile.name.split('.').pop();
                
                let cvFilePath: string;
                let cvFileUrl: string;
                
                if (existingCandidate) {
                    // For existing candidates, upload directly to final path
                    cvFilePath = `${jobId}/${existingCandidate.id}/${Date.now()}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('candidate-cvs')
                        .upload(cvFilePath, applicationData.cvFile, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        throw new Error(`Failed to upload CV: ${uploadError.message}`);
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('candidate-cvs')
                        .getPublicUrl(cvFilePath);
                    cvFileUrl = publicUrl;
                } else {
                    // For new candidates, use temp path first, then we'll re-upload after creating the record
                    const tempCvPath = `${jobId}/temp/${Date.now()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('candidate-cvs')
                        .upload(tempCvPath, applicationData.cvFile, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        throw new Error(`Failed to upload CV: ${uploadError.message}`);
                    }

                    // Store temp path and URL for later use
                    cvFilePath = tempCvPath;
                    const { data: { publicUrl: tempUrl } } = supabase.storage
                        .from('candidate-cvs')
                        .getPublicUrl(tempCvPath);
                    cvFileUrl = tempUrl;
                }

                // Parse CV using MVP parser
                const { extractTextFromCV, parseCVText, calculateBasicMatchScore } = await import('./cvParser');
                
                let parsedData: {
                    fullText: string;
                    name?: string;
                    email?: string;
                    phone?: string;
                    location?: string;
                    skills: string[];
                    experienceYears?: number;
                    matchScore?: number;
                    matchingSkillsCount?: number;
                    workExperience?: Array<{
                        role: string;
                        company: string;
                        startDate?: string;
                        endDate?: string;
                        period: string;
                        description?: string;
                    }>;
                    projects?: Array<{
                        name: string;
                        description?: string;
                        technologies?: string[];
                        url?: string;
                    }>;
                    portfolioUrls?: {
                        github?: string;
                        linkedin?: string;
                        portfolio?: string;
                        dribbble?: string;
                        behance?: string;
                        website?: string;
                        stackoverflow?: string;
                        medium?: string;
                        [key: string]: string | undefined;
                    };
                };

                try {
                    // Extract text from CV
                    const cvText = await extractTextFromCV(applicationData.cvFile);
                    
                    // Parse CV text using AI only (no regex fallback)
                    const { parseCVTextWithAI } = await import('./cvParser');
                    parsedData = await parseCVTextWithAI(cvText, job.skills || []);
                    
                    // Override email with form email (form email is more reliable)
                    parsedData.email = normalizedEmail;
                    
                    // Override phone with form phone if provided
                    if (applicationData.phone) {
                        parsedData.phone = applicationData.phone;
                    }
                    
                    // Calculate match score based on skills overlap (returns score and matching count)
                    const matchResult = calculateBasicMatchScore(parsedData.skills, job.skills || []);
                    parsedData.matchScore = matchResult.score; // Will be null if no job skills
                    parsedData.matchingSkillsCount = matchResult.matchingCount;
                } catch (parseError: any) {
                    console.error('Error parsing CV with AI:', parseError);
                    // Re-throw error - AI parsing is required
                    throw new Error(`CV parsing failed: ${parseError.message || 'AI parsing unavailable'}. Please ensure your Gemini API key is configured correctly.`);;
                }

                const extractedSkills = parsedData.skills;
                const matchingSkillsCount = parsedData.matchingSkillsCount || 0;
                // Only calculate score if we have valid parsed data - no hardcoded fallback
                let matchScore = parsedData.matchScore || null;
                // If still null, calculate from skills if available
                if (matchScore === null && extractedSkills.length > 0 && job.skills && job.skills.length > 0) {
                    const { calculateBasicMatchScore } = await import('./cvParser');
                    const matchResult = calculateBasicMatchScore(extractedSkills, job.skills || []);
                    matchScore = matchResult.score;
                }
                // CV submissions automatically go to Screening stage
                const stage = 'Screening';
                const cvText = parsedData.fullText;

                // Generate AI analysis for CV-submitted candidates (ALWAYS generate during upload)
                let aiAnalysisText = `Skills matched: ${matchingSkillsCount}/${job.skills?.length || 0}. ${parsedData.experienceYears ? `Experience: ${parsedData.experienceYears} years.` : ''}`;
                
                // Always try to generate AI summary if we have job description and CV text
                // This happens during CV upload, so it's ready immediately when viewing
                if (job.description && cvText && cvText.length > 100) {
                    try {
                        const { generateCandidateAnalysis } = await import('./geminiService');
                        const candidateForAnalysis: Candidate = {
                            id: '', // Temporary, won't be used in analysis
                            name: applicationData.name, // Always use form name, never CV-extracted name
                            email: normalizedEmail,
                            role: job.title,
                            jobId: jobId,
                            stage: 'Screening' as any,
                            appliedDate: new Date().toISOString(),
                            location: job.location || '',
                            resumeSummary: cvText.substring(0, 1000),
                            skills: extractedSkills,
                            experience: parsedData.experienceYears,
                            source: 'direct_application'
                        };
                        // Create partial job object for AI analysis (type-safe)
                        const jobForAnalysis: Job = {
                            id: jobId,
                            title: job.title,
                            description: job.description || '',
                            skills: job.skills || [],
                            department: '',
                            location: job.location || '',
                            type: 'Full-time', // Default type for analysis
                            status: 'Active',
                            company: undefined,
                            applicantsCount: 0,
                            postedDate: new Date().toISOString()
                        };
                        const aiResult = await generateCandidateAnalysis(candidateForAnalysis, jobForAnalysis);
                        
                        // Only use AI analysis if it's valid and has content
                        if (aiResult && aiResult.summary && aiResult.summary !== "AI Analysis temporarily unavailable. Please try again.") {
                            // Format AI analysis with strengths and weaknesses (formatted for display)
                            const strengthsText = aiResult.strengths && aiResult.strengths.length > 0 
                                ? `\n\nStrengths:\n• ${aiResult.strengths.join('\n• ')}`
                                : '';
                            const weaknessesText = aiResult.weaknesses && aiResult.weaknesses.length > 0
                                ? `\n\nAreas to Explore:\n• ${aiResult.weaknesses.join('\n• ')}`
                                : '';
                            aiAnalysisText = `${aiResult.summary}${strengthsText}${weaknessesText}`;
                            
                            // Update match score with AI-calculated score (AI uses stricter scoring)
                            if (aiResult.score) {
                                matchScore = aiResult.score;
                            }
                        } else {
                            // If AI returned empty/invalid, keep the basic analysis with correct matching count
                            console.warn('AI analysis returned invalid result, using basic analysis');
                        }
                    } catch (aiError) {
                        // If AI analysis fails, use basic analysis (but log for debugging)
                        console.warn('AI analysis generation failed during CV upload, using basic analysis:', aiError);
                        // aiAnalysisText already has the basic format with correct matching count
                    }
                }

                if (existingCandidate) {
                    // Get existing candidate details to check if they're ai_sourced
                    const { data: candidateDetails } = await supabase
                        .from('candidates')
                        .select('source, stage')
                        .eq('id', existingCandidate.id)
                        .single();
                    
                    const isAiSourced = candidateDetails?.source === 'ai_sourced';
                    const currentStage = candidateDetails?.stage;
                    const shouldMoveToScreening = isAiSourced && currentStage !== 'Screening';
                    
                    // Update existing candidate
                    // CV is already uploaded to final path (cvFilePath and cvFileUrl are set above)
                    const updateData: any = {
                            name: applicationData.name, // Always use form name, never CV-extracted name
                            phone: parsedData.phone || applicationData.phone || null,
                            cover_letter: applicationData.coverLetter || null,
                            cv_file_url: cvFileUrl,
                            cv_file_name: applicationData.cvFile.name,
                            experience: parsedData.experienceYears || null,
                            skills: extractedSkills,
                            resume_summary: cvText.substring(0, 1000), // Store first 1000 chars
                        ai_match_score: matchScore || null, // Calculate match score after CV is uploaded, null if calculation failed
                            ai_analysis: aiAnalysisText,
                            work_experience: parsedData.workExperience || [],
                            projects: parsedData.projects || [],
                            portfolio_urls: parsedData.portfolioUrls || {},
                            source: 'direct_application',
                            is_test: false, // Production mode - always false
                            updated_at: new Date().toISOString()
                    };
                    
                    // If ai_sourced candidate uploads CV, move to Screening stage automatically
                    // CV upload is automated and does not require workflow
                    if (shouldMoveToScreening) {
                        updateData.stage = 'Screening';
                    }
                    
                    const { error: updateError } = await supabase
                        .from('candidates')
                        .update(updateData)
                        .eq('id', existingCandidate.id);

                    if (updateError) {
                        // Delete uploaded file on error
                        await supabase.storage.from('candidate-cvs').remove([cvFilePath]);
                        throw updateError;
                    }

                    // If moved to Screening, execute workflows if configured (optional - won't fail if no workflow)
                    // Skip if screening email was already sent to prevent duplicates
                    if (shouldMoveToScreening) {
                        try {
                            const { executeWorkflowsForStage } = await import('./workflowEngine');
                            // Pass skipIfAlreadySent: true to prevent duplicate screening emails
                            await executeWorkflowsForStage(existingCandidate.id, 'Screening', job.user_id, true);
                        } catch (workflowError) {
                            console.error('Error executing screening workflow:', workflowError);
                            // Don't fail the update if workflow execution fails - CV upload is automated
                        }
                    }

                    return {
                        success: true,
                        isUpdate: true,
                        candidateId: existingCandidate.id,
                        message: `Your application has been updated. You previously applied on ${new Date(existingCandidate.applied_date).toLocaleDateString()}.`
                    };
                } else {
                    // Create new candidate
                    // CV upload is automated and does not require workflow
                    // Use job location, not CV location - candidate applied for this specific job
                    // CV is currently in temp path, will be re-uploaded to final path after candidate creation
                    // Production mode - no test data
                    const { data: newCandidate, error: insertError } = await supabase
                        .from('candidates')
                        .insert({
                            user_id: job.user_id,
                            job_id: jobId,
                            name: applicationData.name, // Always use form name, never CV-extracted name
                            email: normalizedEmail,
                            phone: parsedData.phone || applicationData.phone || null,
                            cover_letter: applicationData.coverLetter || null,
                            cv_file_url: cvFileUrl, // Temp URL for now
                            cv_file_name: applicationData.cvFile.name,
                            role: job.title, // Use job title, not anything from CV
                            location: job.location || '', // Use job location, not CV location
                            experience: parsedData.experienceYears || null,
                            skills: extractedSkills,
                            resume_summary: cvText.substring(0, 1000) || 'Resume submitted',
                            ai_match_score: matchScore || null, // Calculate match score after CV is uploaded, null if calculation failed
                            ai_analysis: aiAnalysisText, // Use AI-generated analysis if available
                            work_experience: parsedData.workExperience || [],
                            projects: parsedData.projects || [],
                            portfolio_urls: parsedData.portfolioUrls || {},
                            stage: stage, // New CV submissions go to Screening
                            source: 'direct_application',
                            is_test: false, // Production mode - always false
                            applied_date: new Date().toISOString()
                        })
                        .select()
                        .single();

                    if (insertError) {
                        // Delete uploaded file on error
                        await supabase.storage.from('candidate-cvs').remove([cvFilePath]);
                        throw insertError;
                    }

                    // Re-upload file to final location (copy file data to final path)
                    const finalCvPath = `${jobId}/${newCandidate.id}/${Date.now()}.${fileExt}`;
                    const { error: reUploadError } = await supabase.storage
                        .from('candidate-cvs')
                        .upload(finalCvPath, applicationData.cvFile, {
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (!reUploadError) {
                        // Update CV URL with final path
                        const { data: { publicUrl: finalUrl } } = supabase.storage
                            .from('candidate-cvs')
                            .getPublicUrl(finalCvPath);
                        
                        await supabase
                            .from('candidates')
                            .update({ cv_file_url: finalUrl })
                            .eq('id', newCandidate.id);
                        
                        // Delete temp file
                        await supabase.storage.from('candidate-cvs').remove([cvFilePath]);
                    }
                    // If re-upload fails, candidate still has temp URL - acceptable for MVP

                    // Notify recruiter
                    try {
                        const { logCandidateAdded } = await import('./activityLogger');
                        await logCandidateAdded(applicationData.name);
                    } catch (logError) {
                        console.error('Error logging candidate addition:', logError);
                    }

                    // Execute workflows for Screening stage if workflow is configured (optional)
                    // CV upload is automated and does not require workflow - email is sent only if workflow exists
                    try {
                        const { executeWorkflowsForStage } = await import('./workflowEngine');
                        await executeWorkflowsForStage(newCandidate.id, 'Screening', job.user_id, false);
                    } catch (workflowError) {
                        console.error('Error executing screening workflow for new CV application:', workflowError);
                        // Don't fail the application if workflow execution fails - CV upload is automated
                    }

                    return {
                        success: true,
                        isUpdate: false,
                        candidateId: newCandidate.id,
                        message: 'Application submitted successfully!'
                    };
                }
            } catch (error: any) {
                console.error('Error submitting application:', error);
                return {
                    success: false,
                    message: error.message || 'Failed to submit application. Please try again.'
                };
            }
        },
        list: async (options?: { page?: number; pageSize?: number }): Promise<{ data: Candidate[]; total: number; page: number; pageSize: number; totalPages: number }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const page = options?.page || 1;
            const pageSize = options?.pageSize || 50; // Default 50 per page
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            // Get total count first
            const { count, error: countError } = await supabase
                .from('candidates')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (countError) throw countError;

            const { data, error } = await supabase
                .from('candidates')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Get unique job IDs to fetch job skills (exclude closed jobs)
            const jobIds = [...new Set((data || []).map(c => c.job_id))];
            const { data: jobs } = await supabase
                .from('jobs')
                .select('id, skills, status')
                .in('id', jobIds)
                .neq('status', 'Closed');
            
            // Filter out candidates from closed jobs
            const activeJobIds = new Set((jobs || []).map(j => j.id));
            const filteredCandidates = (data || []).filter(c => activeJobIds.has(c.job_id));
            
            const jobsMap = new Map((jobs || []).map(j => [j.id, j]));

            // Calculate scores for candidates without scores but with skills
            // Fix N+1 query: Batch calculate scores instead of individual queries
            // Import cvParser once at the top level
            const { calculateBasicMatchScore } = await import('./cvParser');
            
            const candidatesWithScores = (filteredCandidates || []).map((candidate) => {
                let aiMatchScore = candidate.ai_match_score;
                
                // If no score but has skills, calculate one using already-fetched job data
                if (aiMatchScore === null && candidate.skills && candidate.skills.length > 0) {
                    const job = jobsMap.get(candidate.job_id);
                    if (job && job.skills && job.skills.length > 0) {
                        try {
                            const matchResult = calculateBasicMatchScore(candidate.skills, job.skills);
                            aiMatchScore = matchResult.score;
                        } catch (error) {
                            console.error('Error calculating match score for candidate:', error);
                        }
                    }
                }
                
                return {
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                role: candidate.role || '',
                jobId: candidate.job_id,
                stage: candidate.stage as CandidateStage,
                appliedDate: candidate.applied_date || candidate.created_at,
                location: candidate.location || '',
                resumeSummary: candidate.resume_summary,
                    aiMatchScore: aiMatchScore,
                aiAnalysis: candidate.ai_analysis,
                avatarUrl: candidate.avatar_url,
                experience: candidate.experience,
                skills: candidate.skills || [],
                cvFileUrl: candidate.cv_file_url,
                cvFileName: candidate.cv_file_name,
                source: candidate.source,
                isTest: candidate.is_test,
                workExperience: candidate.work_experience || [],
                projects: candidate.projects || [],
                portfolioUrls: candidate.portfolio_urls || {},
                profileUrl: candidate.profile_url
            };
            });
            
            return {
                data: candidatesWithScores,
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize)
            };
        },
        getEmailHistory: async (candidateId: string): Promise<EmailLog[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (!candidate) throw new Error('Candidate not found');

            // Get all email logs for this candidate
            const { data: emailLogs, error } = await supabase
                .from('email_logs')
                .select('*')
                .eq('candidate_id', candidateId)
                .eq('user_id', userId)
                .order('sent_at', { ascending: false });

            if (error) throw error;

            return (emailLogs || []).map((log: any) => ({
                id: log.id,
                candidateId: log.candidate_id,
                userId: log.user_id,
                toEmail: log.to_email,
                fromEmail: log.from_email,
                subject: log.subject,
                content: log.content,
                emailType: log.email_type as any,
                status: log.status as any,
                sentAt: log.sent_at,
                threadId: log.thread_id || undefined,
                replyToId: log.reply_to_id || undefined,
                createdAt: log.created_at
            }));
        },
        update: async (candidateId: string, updates: Partial<Candidate>): Promise<Candidate> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get current candidate data to check if stage is changing
            let oldStage: CandidateStage | undefined;
            let candidateName: string | undefined;
            if (updates.stage !== undefined) {
                const { data: currentData } = await supabase
                    .from('candidates')
                    .select('stage, name')
                    .eq('id', candidateId)
                    .eq('user_id', userId)
                    .single();
                
                if (currentData) {
                    oldStage = currentData.stage as CandidateStage;
                    candidateName = currentData.name;
                }
                
                // Prevent manual movement from "New" to any stage - "New" stage candidates must upload CV first to move to Screening
                if (oldStage === 'New') {
                    throw new Error('Cannot manually move candidates from "New" stage. Candidates in "New" stage must upload their CV first, which will automatically move them to "Screening" stage.');
                }
                
                // Check if a workflow is configured for the target stage before allowing movement
                // Interview stage is exempt - interviews are manually scheduled, not automatic
                if (updates.stage !== 'Interview') {
                const { data: workflows, error: workflowCheckError } = await supabase
                    .from('email_workflows')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('trigger_stage', updates.stage)
                    .eq('enabled', true)
                    .limit(1);
                
                if (workflowCheckError) {
                    throw new Error(`Error checking workflows: ${workflowCheckError.message}`);
                }
                
                if (!workflows || workflows.length === 0) {
                    const stageNames: Record<string, string> = {
                        'Screening': 'Screening',
                        'Offer': 'Offer',
                        'Rejected': 'Rejection',
                        'Hired': 'Hired',
                        'New': 'New'
                    };
                    const stageName = stageNames[updates.stage] || updates.stage;
                    throw new Error(`Cannot move candidate to "${stageName}" stage. Please create an email workflow for the "${stageName}" stage in Settings > Email Workflows first.`);
                    }
                }
                
                // Special check for Offer stage: candidate must have an active offer specifically linked to them
                if (updates.stage === 'Offer') {
                    const { data: offers, error: offerCheckError } = await supabase
                        .from('offers')
                        .select('id, status, candidate_id')
                        .eq('user_id', userId)
                        .eq('candidate_id', candidateId) // Must be specifically linked to this candidate
                        .in('status', ['draft', 'sent', 'viewed', 'negotiating', 'accepted'])
                        .limit(1);
                    
                    if (offerCheckError) {
                        throw new Error(`Error checking offers: ${offerCheckError.message}`);
                    }
                    
                    if (!offers || offers.length === 0) {
                        throw new Error('Cannot move candidate to "Offer" stage. Please create a job offer for this candidate first, or link a general offer from the candidate profile. You can create an offer from the candidate profile or link a general offer from the Offers tab.');
                    }
                }
            }

            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.stage !== undefined) updateData.stage = updates.stage;
            if (updates.role !== undefined) updateData.role = updates.role;
            if (updates.location !== undefined) updateData.location = updates.location;
            if (updates.experience !== undefined) updateData.experience = updates.experience;
            if (updates.skills !== undefined) updateData.skills = updates.skills;
            if (updates.resumeSummary !== undefined) updateData.resume_summary = updates.resumeSummary;
            if (updates.aiMatchScore !== undefined) updateData.ai_match_score = updates.aiMatchScore;
            if (updates.aiAnalysis !== undefined) updateData.ai_analysis = updates.aiAnalysis;

            // Atomic update: This UPDATE statement REPLACES the stage value
            // The candidate will be in the NEW stage only, not the old one
            const { data, error } = await supabase
                .from('candidates')
                .update(updateData)
                .eq('id', candidateId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log stage change activity
            if (updates.stage !== undefined && oldStage && oldStage !== updates.stage && candidateName) {
                try {
                    const { logCandidateMoved } = await import('./activityLogger');
                    await logCandidateMoved(candidateName, oldStage, updates.stage as CandidateStage);
                } catch (error) {
                    console.error('Error logging candidate stage change:', error);
                }
            }
            
            // Log candidate edit activity
            if (updates.name || updates.email || updates.role || updates.location) {
                try {
                    const { logCandidateEdited } = await import('./activityLogger');
                    await logCandidateEdited(candidateName || data.name);
                } catch (error) {
                    console.error('Error logging candidate edit:', error);
                }
            }
            
            // Log candidate scoring if AI match score was updated
            if (updates.aiMatchScore !== undefined && candidateName) {
                try {
                    const { logCandidateScored } = await import('./activityLogger');
                    await logCandidateScored(candidateName, updates.aiMatchScore);
                } catch (error) {
                    console.error('Error logging candidate score:', error);
                }
            }

            // Execute workflows for the new stage
            // Note: We execute workflows AFTER stage update to ensure candidate is in correct stage
            // If workflow execution fails, we log the error but don't rollback the stage update
            // This is intentional - the candidate stage change is the source of truth
            // Failed workflows can be retried manually or via execution logs
            if (updates.stage !== undefined) {
                // Skip workflow execution for Offer stage if an offer email was just sent
                // (This prevents duplicate emails when offer.send() moves candidate to Offer stage)
                const shouldSkipIfAlreadySent = updates.stage === 'Screening' || updates.stage === 'Offer';
                try {
                    const { executeWorkflowsForStage } = await import('./workflowEngine');
                    await executeWorkflowsForStage(candidateId, updates.stage, userId, shouldSkipIfAlreadySent);
                } catch (workflowError: any) {
                    // Log error but don't fail the candidate update
                    // This ensures candidate stage is updated even if workflow execution fails
                    console.error('Error executing workflows:', workflowError);
                    // Optionally: Create a failed execution log for monitoring
                    try {
                        const workflowIds = await supabase
                            .from('email_workflows')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('trigger_stage', updates.stage)
                            .eq('enabled', true);
                        
                        if (workflowIds.data && workflowIds.data.length > 0) {
                            // Log failed execution for monitoring (but don't block stage update)
                            console.warn(`[Workflow Engine] Failed to execute ${workflowIds.data.length} workflow(s) for stage ${updates.stage} - candidate stage updated but workflows may need manual retry`);
                        }
                    } catch (logError) {
                        // Ignore logging errors
                        console.error('Error logging workflow failure:', logError);
                    }
                }
            }

            return {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role || '',
                jobId: data.job_id,
                stage: data.stage as CandidateStage,
                appliedDate: data.applied_date || data.created_at,
                location: data.location || '',
                resumeSummary: data.resume_summary,
                aiMatchScore: data.ai_match_score,
                aiAnalysis: data.ai_analysis,
                avatarUrl: data.avatar_url,
                experience: data.experience,
                skills: data.skills || [],
                workExperience: data.work_experience || [],
                projects: data.projects || [],
                portfolioUrls: data.portfolio_urls || {},
                profileUrl: data.profile_url
            };
        },
        search: async (query: string, stageFilter?: CandidateStage): Promise<Candidate[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            if (!query || query.trim().length === 0) {
                return [];
            }

            const searchTerm = `%${query.trim()}%`;
            
            let queryBuilder = supabase
                .from('candidates')
                .select('*')
                .eq('user_id', userId)
                .or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`);

            // Filter by stage if provided
            if (stageFilter) {
                queryBuilder = queryBuilder.eq('stage', stageFilter);
            }
            
            const { data, error } = await queryBuilder
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Search error:', error);
                throw error;
            }

            return (data || []).map(candidate => ({
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                role: candidate.role || '',
                jobId: candidate.job_id,
                stage: candidate.stage as CandidateStage,
                appliedDate: candidate.applied_date || candidate.created_at,
                location: candidate.location || '',
                resumeSummary: candidate.resume_summary,
                aiMatchScore: candidate.ai_match_score,
                aiAnalysis: candidate.ai_analysis,
                avatarUrl: candidate.avatar_url,
                experience: candidate.experience,
                skills: candidate.skills || [],
                updatedAt: candidate.updated_at,
                cvFileUrl: candidate.cv_file_url,
                cvFileName: candidate.cv_file_name,
                source: candidate.source,
                isTest: candidate.is_test,
                workExperience: candidate.work_experience || [],
                projects: candidate.projects || [],
                portfolioUrls: candidate.portfolio_urls || {},
                profileUrl: candidate.profile_url
            }));
        },
        getNotes: async (candidateId: string): Promise<Note[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (!candidate) throw new Error('Candidate not found');

            // Get notes
            const { data: notes, error } = await supabase
                .from('candidate_notes')
                .select(`
                    id,
                    candidate_id,
                    user_id,
                    content,
                    is_private,
                    created_at,
                    updated_at
                `)
                .eq('candidate_id', candidateId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get user names and avatars for all unique user IDs
            const userIds = [...new Set((notes || []).map((n: any) => n.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .in('id', userIds);

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, { name: p.name, avatarUrl: p.avatar_url }]));

            return (notes || []).map((note: any) => {
                const profile = profileMap.get(note.user_id);
                return {
                    id: note.id,
                    candidateId: note.candidate_id,
                    userId: note.user_id,
                    content: note.content,
                    isPrivate: note.is_private,
                    createdAt: note.created_at,
                    updatedAt: note.updated_at,
                    userName: profile?.name || 'Unknown',
                    userAvatarUrl: profile?.avatarUrl || undefined
                };
            });
        },
        addNote: async (candidateId: string, content: string, isPrivate: boolean = false): Promise<Note> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (!candidate) throw new Error('Candidate not found');

            // Get user name and avatar for response
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', userId)
                .single();

            const { data: note, error } = await supabase
                .from('candidate_notes')
                .insert({
                    candidate_id: candidateId,
                    user_id: userId,
                    content: content.trim(),
                    is_private: isPrivate
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: note.id,
                candidateId: note.candidate_id,
                userId: note.user_id,
                content: note.content,
                isPrivate: note.is_private,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
                userName: profile?.name || 'Unknown',
                userAvatarUrl: profile?.avatar_url || undefined
            };
        },
        updateNote: async (noteId: string, content: string): Promise<Note> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get user name and avatar for response
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', userId)
                .single();

            const { data: note, error } = await supabase
                .from('candidate_notes')
                .update({
                    content: content.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId)
                .eq('user_id', userId) // Ensure user can only update their own notes
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Note not found or you do not have permission to update it');
                }
                throw error;
            }

            return {
                id: note.id,
                candidateId: note.candidate_id,
                userId: note.user_id,
                content: note.content,
                isPrivate: note.is_private,
                createdAt: note.created_at,
                updatedAt: note.updated_at,
                userName: profile?.name || 'Unknown',
                userAvatarUrl: profile?.avatar_url || undefined
            };
        },
        deleteNote: async (noteId: string): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('candidate_notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', userId); // Ensure user can only delete their own notes

            if (error) throw error;
        },
        generateRegistrationToken: async (candidateId: string): Promise<string> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate, error: candidateError } = await supabase
                .from('candidates')
                .select('id, user_id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (candidateError || !candidate) {
                throw new Error('Candidate not found or access denied');
            }

            // Generate secure random token (32 characters)
            const generateSecureToken = () => {
                const array = new Uint8Array(32);
                crypto.getRandomValues(array);
                return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            };

            const token = generateSecureToken();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

            // Update candidate with token
            const { error: updateError } = await supabase
                .from('candidates')
                .update({
                    registration_token: token,
                    registration_token_expires_at: expiresAt.toISOString(),
                    registration_token_used: false
                })
                .eq('id', candidateId)
                .eq('user_id', userId);

            if (updateError) throw updateError;

            return token;
        },
        register: async (candidateId: string, token: string, email: string): Promise<void> => {
            // Normalize email
            const normalizedEmail = email.toLowerCase().trim();

            // Validate token - check if exists, not expired, not used, and get candidate with user_id and stage
            const { data: candidate, error: candidateError } = await supabase
                .from('candidates')
                .select('id, user_id, job_id, stage, registration_token, registration_token_expires_at, registration_token_used, email')
                .eq('id', candidateId)
                .single();

            if (candidateError || !candidate) {
                throw new Error('Candidate not found');
            }

            if (candidate.email) {
                throw new Error('Candidate already has an email registered');
            }

            if (!candidate.registration_token || candidate.registration_token !== token) {
                throw new Error('Invalid registration token');
            }

            if (candidate.registration_token_used) {
                throw new Error('Registration token has already been used');
            }

            const expiresAt = candidate.registration_token_expires_at ? new Date(candidate.registration_token_expires_at) : null;
            if (expiresAt && expiresAt < new Date()) {
                throw new Error('Registration token has expired');
            }

            // Update candidate with email, mark token as used, and move to Screening stage
            // After registration, candidate moves to Screening to receive CV upload instructions via email
            const { error: updateError } = await supabase
                .from('candidates')
                .update({
                    email: normalizedEmail,
                    registration_token_used: true,
                    stage: 'Screening' // Move to Screening after registration - they'll get email with CV upload link
                })
                .eq('id', candidateId);

            if (updateError) throw updateError;

            // Execute Screening workflow to send email with CV upload link
            // This happens after email is registered, so they can receive the workflow email
            if (candidate.user_id) {
                try {
                    // Small delay to ensure database update is fully committed
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Re-fetch candidate to ensure we have the latest data including the newly registered email
                    const { data: updatedCandidate, error: fetchError } = await supabase
                        .from('candidates')
                        .select('*')
                        .eq('id', candidateId)
                        .single();
                    
                    if (fetchError) {
                        console.error('[Registration] Error fetching updated candidate:', fetchError);
                    }
                    
                    if (!updatedCandidate || !updatedCandidate.email) {
                        console.warn('[Registration] Candidate email not found after update - workflow may not execute');
                        console.warn('[Registration] Updated candidate data:', updatedCandidate);
                    } else {
                        console.log(`[Registration] Candidate email confirmed: ${updatedCandidate.email}`);
                    }
                    
                    const { executeWorkflowsForStage } = await import('./workflowEngine');
                    // Don't skip if already sent - this is the first email after registration
                    console.log(`[Registration] Executing Screening workflow for candidate ${candidateId} (user: ${candidate.user_id})`);
                    await executeWorkflowsForStage(candidateId, 'Screening', candidate.user_id, false);
                    console.log(`[Registration] Screening workflow execution completed for candidate ${candidateId}`);
                } catch (workflowError) {
                    console.error('[Registration] Error executing screening workflow after registration:', workflowError);
                    console.error('[Registration] Workflow error details:', {
                        message: workflowError instanceof Error ? workflowError.message : 'Unknown error',
                        stack: workflowError instanceof Error ? workflowError.stack : undefined
                    });
                    // Don't fail registration if workflow execution fails - email is registered successfully
                }
            } else {
                console.warn('[Registration] No user_id found for candidate - cannot execute workflow');
            }
        }
    },
    interviews: {
        list: async (): Promise<Interview[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get current date/time to filter out past interviews
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

            // First, get all scheduled interviews for this user
            const { data: interviewsData, error: interviewsError } = await supabase
                .from('interviews')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'Scheduled')
                .gte('date', today) // Only future or today's interviews
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (interviewsError) throw interviewsError;

            if (!interviewsData || interviewsData.length === 0) {
                return [];
            }

            // Get candidate IDs and fetch their names
            const candidateIds = [...new Set(interviewsData.map(i => i.candidate_id))];
            
            const { data: candidatesData, error: candidatesError } = await supabase
                .from('candidates')
                .select('id, name')
                .eq('user_id', userId)
                .in('id', candidateIds);

            if (candidatesError) throw candidatesError;

            // Create a map of candidate ID to candidate data
            const candidateMap = new Map(
                (candidatesData || []).map(c => [c.id, c])
            );

            // Filter interviews to only include those that haven't passed yet
            const upcomingInterviews = interviewsData.filter(interview => {
                const interviewDate = interview.date;
                const interviewTime = interview.time;
                
                // If interview is today, check if time hasn't passed
                if (interviewDate === today) {
                    return interviewTime >= currentTime;
                }
                
                // If interview is in the future, include it
                return interviewDate > today;
            });

            return upcomingInterviews.map(interview => {
                const candidate = candidateMap.get(interview.candidate_id);
                return {
                    id: interview.id,
                    candidateId: interview.candidate_id,
                    candidateName: candidate?.name || 'Unknown',
                    jobTitle: interview.job_title,
                    date: interview.date,
                    time: interview.time,
                    endTime: interview.end_time || undefined,
                    type: interview.type,
                    interviewer: interview.interviewer || '',
                    durationMinutes: interview.duration_minutes || 60,
                    timezone: interview.timezone || 'UTC',
                    reminderSent: interview.reminder_sent || false,
                    meetingLink: interview.meeting_link || undefined,
                    notes: interview.notes || undefined,
                    status: interview.status || 'Scheduled'
                };
            });
        },
        create: async (candidateId: string, interviewData: {
            jobTitle: string;
            date: string;
            time: string;
            endTime?: string;
            type: 'Google Meet' | 'Phone' | 'In-Person';
            interviewer?: string;
            durationMinutes?: number;
            timezone?: string;
            meetingLink?: string;
            notes?: string;
        }): Promise<Interview> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: interview, error } = await supabase
                .from('interviews')
                .insert({
                    user_id: userId,
                    candidate_id: candidateId,
                    job_title: interviewData.jobTitle,
                    date: interviewData.date,
                    time: interviewData.time,
                    end_time: interviewData.endTime || null,
                    type: interviewData.type,
                    interviewer: interviewData.interviewer || null,
                    duration_minutes: interviewData.durationMinutes || 60,
                    timezone: interviewData.timezone || 'UTC',
                    meeting_link: interviewData.meetingLink || null,
                    notes: interviewData.notes || null,
                    status: 'Scheduled'
                })
                .select('*, candidates!inner(id, name)')
                .single();

            if (error) throw error;

            return {
                id: interview.id,
                candidateId: interview.candidate_id,
                candidateName: (interview as any).candidates?.name || 'Unknown',
                jobTitle: interview.job_title,
                date: interview.date,
                time: interview.time,
                endTime: interview.end_time || undefined,
                type: interview.type,
                interviewer: interview.interviewer || '',
                durationMinutes: interview.duration_minutes || 60,
                timezone: interview.timezone || 'UTC',
                reminderSent: interview.reminder_sent || false,
                meetingLink: interview.meeting_link || undefined,
                notes: interview.notes || undefined,
                status: interview.status || 'Scheduled'
            };
        },
        getCalendar: async (startDate: string, endDate: string, filters?: {
            candidateId?: string;
            jobId?: string;
            type?: 'Google Meet' | 'Phone' | 'In-Person';
            status?: 'Scheduled' | 'Completed' | 'Cancelled';
        }): Promise<Interview[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            let query = supabase
                .from('interviews')
                .select(`
                    *,
                    candidates!inner(id, name)
                `)
                .eq('user_id', userId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            // Apply filters
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.type) {
                query = query.eq('type', filters.type);
            }
            if (filters?.candidateId) {
                query = query.eq('candidate_id', filters.candidateId);
            }

            const { data: interviewsData, error } = await query;

            if (error) throw error;

            // Get attendees for each interview
            const interviewIds = (interviewsData || []).map((i: any) => i.id);
            const attendeesMap = new Map<string, any[]>();
            
            if (interviewIds.length > 0) {
                const { data: attendeesData, error: attendeesError } = await supabase
                    .from('interview_attendees')
                    .select('*')
                    .in('interview_id', interviewIds);

                if (attendeesError) {
                    console.error('Error fetching attendees:', attendeesError);
                } else {
                    // Get unique user IDs from attendees
                    const userIds = [...new Set((attendeesData || []).map((a: any) => a.user_id))];
                    
                    // Fetch profiles for these users
                    let profilesMap = new Map<string, { name: string; avatar_url: string | null }>();
                    if (userIds.length > 0) {
                        const { data: profilesData } = await supabase
                            .from('profiles')
                            .select('id, name, avatar_url')
                            .in('id', userIds);
                        
                        (profilesData || []).forEach((profile: any) => {
                            profilesMap.set(profile.id, {
                                name: profile.name,
                                avatar_url: profile.avatar_url
                            });
                        });
                    }

                    // Map attendees to interviews
                    (attendeesData || []).forEach((attendee: any) => {
                        if (!attendeesMap.has(attendee.interview_id)) {
                            attendeesMap.set(attendee.interview_id, []);
                        }
                        const profile = profilesMap.get(attendee.user_id);
                        attendeesMap.get(attendee.interview_id)!.push({
                            id: attendee.id,
                            interviewId: attendee.interview_id,
                            userId: attendee.user_id,
                            role: attendee.role,
                            userName: profile?.name,
                            userAvatarUrl: profile?.avatar_url || undefined
                        });
                    });
                }
            }

            return (interviewsData || []).map((interview: any) => ({
                id: interview.id,
                candidateId: interview.candidate_id,
                candidateName: interview.candidates?.name || 'Unknown',
                jobTitle: interview.job_title,
                date: interview.date,
                time: interview.time,
                endTime: interview.end_time || undefined,
                type: interview.type,
                interviewer: interview.interviewer || '',
                durationMinutes: interview.duration_minutes || 60,
                timezone: interview.timezone || 'UTC',
                reminderSent: interview.reminder_sent || false,
                meetingLink: interview.meeting_link || undefined,
                notes: interview.notes || undefined,
                status: interview.status || 'Scheduled',
                attendees: attendeesMap.get(interview.id) || []
            }));
        },
        checkConflicts: async (date: string, time: string, durationMinutes: number = 60, excludeInterviewId?: string): Promise<Interview[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Calculate end time
            const [hours, minutes] = time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + durationMinutes;
            const endHour = Math.floor(endMinutes / 60) % 24;
            const endMin = endMinutes % 60;
            const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

            // Get all interviews for this date
            let query = supabase
                .from('interviews')
                .select('*')
                .eq('user_id', userId)
                .eq('date', date)
                .eq('status', 'Scheduled');

            if (excludeInterviewId) {
                query = query.neq('id', excludeInterviewId);
            }

            const { data: existingInterviews, error } = await query;

            if (error) throw error;

            // Helper function to calculate end time
            const calculateEndTime = (startTime: string, durationMinutes: number): string => {
                const [hours, minutes] = startTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes + durationMinutes;
                const endHour = Math.floor(totalMinutes / 60) % 24;
                const endMin = totalMinutes % 60;
                return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;
            };

            // Check for time overlaps
            const conflicts = (existingInterviews || []).filter((interview: any) => {
                const existingStart = interview.time;
                const existingEnd = interview.end_time || calculateEndTime(interview.time, interview.duration_minutes || 60);
                
                // Check if times overlap
                return (time < existingEnd && endTime > existingStart);
            });

            // Get candidate names for conflicts
            const candidateIds = [...new Set(conflicts.map((c: any) => c.candidate_id))];
            const { data: candidates } = await supabase
                .from('candidates')
                .select('id, name')
                .in('id', candidateIds);

            const candidateMap = new Map((candidates || []).map((c: any) => [c.id, c]));

            return conflicts.map((interview: any) => ({
                id: interview.id,
                candidateId: interview.candidate_id,
                candidateName: candidateMap.get(interview.candidate_id)?.name || 'Unknown',
                jobTitle: interview.job_title,
                date: interview.date,
                time: interview.time,
                endTime: interview.end_time || undefined,
                type: interview.type,
                interviewer: interview.interviewer || '',
                durationMinutes: interview.duration_minutes || 60
            }));
        },
        reschedule: async (interviewId: string, newDate: string, newTime: string, newDurationMinutes?: number): Promise<Interview> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            console.log('[Reschedule API] Rescheduling interview:', { interviewId, userId, newDate, newTime });

            // Get old interview data before updating
            // Note: interviews -> candidates -> jobs (no direct relationship between interviews and jobs)
            const { data: oldInterview, error: fetchError } = await supabase
                .from('interviews')
                .select('*, candidates!inner(id, name, email, job_id, is_test)')
                .eq('id', interviewId)
                .eq('user_id', userId)
                .single();

            if (fetchError) {
                console.error('[Reschedule API] Error fetching interview:', fetchError);
                throw new Error(`Failed to fetch interview: ${fetchError.message}`);
            }

            if (!oldInterview) {
                console.error('[Reschedule API] Interview not found:', { interviewId, userId });
                // Try to find it without user_id filter to see if it exists
                const { data: anyInterview } = await supabase
                    .from('interviews')
                    .select('id, user_id')
                    .eq('id', interviewId)
                    .single();
                console.error('[Reschedule API] Interview lookup result:', anyInterview);
                throw new Error('Interview not found');
            }

            // Fetch job data separately since there's no direct relationship
            let jobTitle = oldInterview.job_title || 'Position';
            let companyName = 'Our Company';
            
            if (oldInterview.candidates?.job_id) {
                const { data: jobData } = await supabase
                    .from('jobs')
                    .select('title, company')
                    .eq('id', oldInterview.candidates.job_id)
                    .eq('user_id', userId)
                    .single();
                
                if (jobData) {
                    jobTitle = jobData.title || jobTitle;
                    companyName = jobData.company || companyName;
                }
            }

            const oldDate = oldInterview.date;
            const oldTime = oldInterview.time;

            const updateData: any = {
                date: newDate,
                time: newTime,
                updated_at: new Date().toISOString()
            };

            if (newDurationMinutes !== undefined) {
                updateData.duration_minutes = newDurationMinutes;
            }

            const { data, error } = await supabase
                .from('interviews')
                .update(updateData)
                .eq('id', interviewId)
                .eq('user_id', userId)
                .select('*, candidates!inner(id, name, email, is_test)')
                .single();

            if (error) throw error;

            // Fetch updated interview with all fields (including meeting_link and address)
            const { data: updatedInterview } = await supabase
                .from('interviews')
                .select('meeting_link, address, type, duration_minutes')
                .eq('id', interviewId)
                .single();

            // Generate new meeting link if it's a Google Meet interview
            let newMeetingLink: string | null = null;
            if (updatedInterview?.type === 'Google Meet') {
                try {
                    // Build ISO start datetime from new date and time
                    const startDateTime = new Date(`${newDate}T${newTime}`);
                    const durationMinutes = newDurationMinutes || updatedInterview.duration_minutes || 60;

                    const { data: meetingData, error: meetingError } = await supabase.functions.invoke('create-meeting', {
                        body: {
                            platform: 'meet',
                            title: `${jobTitle} - Interview`,
                            startIso: startDateTime.toISOString(),
                            durationMinutes: durationMinutes,
                        }
                    });

                    if (!meetingError && meetingData?.meetingUrl) {
                        newMeetingLink = meetingData.meetingUrl;
                        
                        // Update the interview with the new meeting link
                        await supabase
                            .from('interviews')
                            .update({ meeting_link: newMeetingLink })
                            .eq('id', interviewId);
                        
                        console.log('[Reschedule] New meeting link generated:', newMeetingLink);
                    } else {
                        console.warn('[Reschedule] Failed to generate new meeting link:', meetingError);
                        // Fall back to old meeting link if generation fails
                        newMeetingLink = updatedInterview?.meeting_link || null;
                    }
                } catch (meetingErr: any) {
                    console.error('[Reschedule] Error generating new meeting link:', meetingErr);
                    // Fall back to old meeting link if generation fails
                    newMeetingLink = updatedInterview?.meeting_link || null;
                }
            }

            // Send reschedule notification email to candidate
            if (oldInterview.candidates?.email && !oldInterview.candidates?.is_test && (oldDate !== newDate || oldTime !== newTime)) {
                try {
                    // Fetch reschedule email template (or fall back to Interview template)
                    const { data: rescheduleTemplate } = await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('type', 'Reschedule')
                        .single();

                    // If no Reschedule template, try Interview template
                    const { data: interviewTemplate } = rescheduleTemplate ? { data: null } : await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('type', 'Interview')
                        .single();

                    const template = rescheduleTemplate || interviewTemplate;

                    if (template) {
                        // Format date and time separately for email
                        const formatDateOnly = (dateStr: string) => {
                            const date = new Date(dateStr);
                            return date.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric'
                            });
                        };

                        const formatTimeOnly = (timeStr: string) => {
                            const [hours, minutes] = timeStr.split(':').map(Number);
                            const date = new Date();
                            date.setHours(hours, minutes);
                            return date.toLocaleTimeString('en-US', { 
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            });
                        };

                        const formatDateTimeFull = (dateStr: string, timeStr: string) => {
                            const date = new Date(dateStr);
                            const [hours, minutes] = timeStr.split(':').map(Number);
                            date.setHours(hours, minutes);
                            return date.toLocaleString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                            });
                        };

                        const oldDateFormatted = formatDateOnly(oldDate);
                        const oldTimeFormatted = formatTimeOnly(oldTime);
                        const oldDateTime = formatDateTimeFull(oldDate, oldTime);
                        
                        const newDateFormatted = formatDateOnly(newDate);
                        const newTimeFormatted = formatTimeOnly(newTime);
                        const newDateTime = formatDateTimeFull(newDate, newTime);

                        // Get user profile for your_name placeholder
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('name')
                            .eq('id', userId)
                            .single();
                        
                        const userName = profile?.name || 'Recruiter';

                        // Get interview details from system
                        const candidateName = oldInterview.candidates?.name || 'Candidate';
                        const interviewType = updatedInterview?.type || 'Interview';
                        const interviewDuration = newDurationMinutes || updatedInterview?.duration_minutes || 60;
                        const durationText = interviewDuration === 60 ? '1 hour' : `${interviewDuration} minutes`;

                        // Replace template variables
                        let subject = template.subject
                            .replace(/{candidate_name}/g, candidateName)
                            .replace(/{job_title}/g, jobTitle)
                            .replace(/{company_name}/g, companyName)
                            .replace(/{interview_date}/g, newDateFormatted)
                            .replace(/{interview_time}/g, newTimeFormatted)
                            .replace(/{old_interview_date}/g, oldDateFormatted)
                            .replace(/{old_interview_time}/g, oldTimeFormatted)
                            .replace(/{previous_interview_time}/g, oldDateTime)
                            .replace(/{new_interview_time}/g, newDateTime)
                            .replace(/{interview_duration}/g, durationText)
                            .replace(/{interview_type}/g, interviewType)
                            .replace(/{your_name}/g, userName);

                        let content = template.content
                            .replace(/{candidate_name}/g, candidateName)
                            .replace(/{job_title}/g, jobTitle)
                            .replace(/{company_name}/g, companyName)
                            .replace(/{interview_date}/g, newDateFormatted)
                            .replace(/{interview_time}/g, newTimeFormatted)
                            .replace(/{old_interview_date}/g, oldDateFormatted)
                            .replace(/{old_interview_time}/g, oldTimeFormatted)
                            .replace(/{previous_interview_time}/g, oldDateTime)
                            .replace(/{new_interview_time}/g, newDateTime)
                            .replace(/{interview_duration}/g, durationText)
                            .replace(/{interview_type}/g, interviewType)
                            .replace(/{your_name}/g, userName);

                        // Add meeting link or location if available
                        if (updatedInterview?.type === 'Google Meet' && newMeetingLink) {
                            // Format meeting link as clickable HTML anchor tag
                            const formattedMeetingLink = `<a href="${newMeetingLink}" style="color: #2563eb; text-decoration: underline;">${newMeetingLink}</a>`;
                            content = content.replace(/{meeting_link}/g, formattedMeetingLink);
                            // If {meeting_link} wasn't in template, append it
                            if (!template.content.includes('{meeting_link}')) {
                                content += `\n\n**Meeting Link:**\n${formattedMeetingLink}`;
                            }
                        } else if (updatedInterview?.type === 'Google Meet' && updatedInterview?.meeting_link) {
                            // Fallback to old meeting link if new one wasn't generated
                            const formattedMeetingLink = `<a href="${updatedInterview.meeting_link}" style="color: #2563eb; text-decoration: underline;">${updatedInterview.meeting_link}</a>`;
                            content = content.replace(/{meeting_link}/g, formattedMeetingLink);
                            if (!template.content.includes('{meeting_link}')) {
                                content += `\n\n**Meeting Link:**\n${formattedMeetingLink}`;
                            }
                        }

                        if (updatedInterview?.type === 'In-Person' && updatedInterview?.address) {
                            content = content.replace(/{address}/g, updatedInterview.address);
                            // If {address} wasn't in template, append it
                            if (!template.content.includes('{address}')) {
                                content += `\n\n**Location:**\n${updatedInterview.address}`;
                            }
                        }

                        // Send email via edge function
                        const { error: emailError } = await supabase.functions.invoke('send-email', {
                            body: {
                                to: oldInterview.candidates.email,
                                subject: subject,
                                content: content,
                                fromName: 'Recruiter', // Always use "Recruiter" as sender name
                                candidateId: oldInterview.candidates.id,
                                emailType: 'Reschedule'
                            }
                        });

                        if (emailError) {
                            console.error('[Reschedule] Error sending notification email:', emailError);
                            // Don't fail the reschedule if email fails
                        } else {
                            console.log('[Reschedule] Notification email sent successfully to:', oldInterview.candidates.email);
                        }
                    } else {
                        console.warn('[Reschedule] No Reschedule or Interview email template found. Email not sent.');
                    }
                } catch (emailErr: any) {
                    console.error('[Reschedule] Error in email notification:', emailErr);
                    // Don't fail the reschedule if email fails
                }
            }

            return {
                id: data.id,
                candidateId: data.candidate_id,
                candidateName: data.candidates?.name || 'Unknown',
                jobTitle: data.job_title,
                date: data.date,
                time: data.time,
                endTime: data.end_time || undefined,
                type: data.type,
                interviewer: data.interviewer || '',
                durationMinutes: data.duration_minutes || 60
            };
        },
        cancel: async (interviewId: string, reason?: string): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get current interview data first
            const { data: interview } = await supabase
                .from('interviews')
                .select('notes')
                .eq('id', interviewId)
                .eq('user_id', userId)
                .single();

            const { error } = await supabase
                .from('interviews')
                .update({
                    status: 'Cancelled',
                    notes: reason ? `${interview?.notes || ''}\n\nCancelled: ${reason}`.trim() : interview?.notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', interviewId)
                .eq('user_id', userId);

            if (error) throw error;
        },
        getUpcoming: async (days: number = 7): Promise<Interview[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const today = new Date().toISOString().split('T')[0];
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);
            const endDateStr = endDate.toISOString().split('T')[0];

            return api.interviews.getCalendar(today, endDateStr, { status: 'Scheduled' });
        },
        // --- Interview Feedback ---
        getFeedback: async (interviewId: string): Promise<InterviewFeedback | null> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify interview belongs to user
            const { data: interview } = await supabase
                .from('interviews')
                .select('id')
                .eq('id', interviewId)
                .eq('user_id', userId)
                .single();

            if (!interview) throw new Error('Interview not found');

            // Get feedback with user info
            const { data: feedback, error } = await supabase
                .from('interview_feedback')
                .select(`
                    id,
                    interview_id,
                    candidate_id,
                    user_id,
                    overall_rating,
                    technical_skills,
                    communication,
                    cultural_fit,
                    problem_solving,
                    strengths,
                    weaknesses,
                    overall_impression,
                    recommendation,
                    created_at,
                    updated_at
                `)
                .eq('interview_id', interviewId)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No feedback yet
                }
                throw error;
            }

            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', userId)
                .single();

            return {
                id: feedback.id,
                interviewId: feedback.interview_id,
                candidateId: feedback.candidate_id,
                userId: feedback.user_id,
                overallRating: feedback.overall_rating || undefined,
                technicalSkills: feedback.technical_skills || undefined,
                communication: feedback.communication || undefined,
                culturalFit: feedback.cultural_fit || undefined,
                problemSolving: feedback.problem_solving || undefined,
                strengths: feedback.strengths || undefined,
                weaknesses: feedback.weaknesses || undefined,
                overallImpression: feedback.overall_impression || undefined,
                recommendation: feedback.recommendation as any || undefined,
                createdAt: feedback.created_at,
                updatedAt: feedback.updated_at,
                userName: profile?.name || 'Unknown',
                userAvatarUrl: profile?.avatar_url || undefined
            };
        },
        submitFeedback: async (interviewId: string, feedback: {
            overallRating?: number;
            technicalSkills?: number;
            communication?: number;
            culturalFit?: number;
            problemSolving?: number;
            strengths?: string;
            weaknesses?: string;
            overallImpression?: string;
            recommendation?: 'Strong Yes' | 'Yes' | 'Maybe' | 'No' | 'Strong No';
        }): Promise<InterviewFeedback> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify interview belongs to user and get candidate_id
            const { data: interview } = await supabase
                .from('interviews')
                .select('id, candidate_id')
                .eq('id', interviewId)
                .eq('user_id', userId)
                .single();

            if (!interview) throw new Error('Interview not found');

            // Check if feedback already exists
            const { data: existing } = await supabase
                .from('interview_feedback')
                .select('id')
                .eq('interview_id', interviewId)
                .eq('user_id', userId)
                .single();

            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('name, avatar_url')
                .eq('id', userId)
                .single();

            let feedbackData;
            if (existing) {
                // Update existing feedback
                const { data: updated, error: updateError } = await supabase
                    .from('interview_feedback')
                    .update({
                        overall_rating: feedback.overallRating,
                        technical_skills: feedback.technicalSkills,
                        communication: feedback.communication,
                        cultural_fit: feedback.culturalFit,
                        problem_solving: feedback.problemSolving,
                        strengths: feedback.strengths?.trim() || null,
                        weaknesses: feedback.weaknesses?.trim() || null,
                        overall_impression: feedback.overallImpression?.trim() || null,
                        recommendation: feedback.recommendation || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                feedbackData = updated;
            } else {
                // Create new feedback
                const { data: created, error: createError } = await supabase
                    .from('interview_feedback')
                    .insert({
                        interview_id: interviewId,
                        candidate_id: interview.candidate_id,
                        user_id: userId,
                        overall_rating: feedback.overallRating,
                        technical_skills: feedback.technicalSkills,
                        communication: feedback.communication,
                        cultural_fit: feedback.culturalFit,
                        problem_solving: feedback.problemSolving,
                        strengths: feedback.strengths?.trim() || null,
                        weaknesses: feedback.weaknesses?.trim() || null,
                        overall_impression: feedback.overallImpression?.trim() || null,
                        recommendation: feedback.recommendation || null
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                feedbackData = created;
            }

            return {
                id: feedbackData.id,
                interviewId: feedbackData.interview_id,
                candidateId: feedbackData.candidate_id,
                userId: feedbackData.user_id,
                overallRating: feedbackData.overall_rating || undefined,
                technicalSkills: feedbackData.technical_skills || undefined,
                communication: feedbackData.communication || undefined,
                culturalFit: feedbackData.cultural_fit || undefined,
                problemSolving: feedbackData.problem_solving || undefined,
                strengths: feedbackData.strengths || undefined,
                weaknesses: feedbackData.weaknesses || undefined,
                overallImpression: feedbackData.overall_impression || undefined,
                recommendation: feedbackData.recommendation as any || undefined,
                createdAt: feedbackData.created_at,
                updatedAt: feedbackData.updated_at,
                userName: profile?.name || 'Unknown',
                userAvatarUrl: profile?.avatar_url || undefined
            };
        },
        getCandidateInterviews: async (candidateId: string): Promise<Interview[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (!candidate) throw new Error('Candidate not found');

            // Get all interviews for this candidate (both past and future)
            const { data: interviewsData, error } = await supabase
                .from('interviews')
                .select('*')
                .eq('candidate_id', candidateId)
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .order('time', { ascending: false });

            if (error) throw error;

            return (interviewsData || []).map((interview: any) => ({
                id: interview.id,
                candidateId: interview.candidate_id,
                candidateName: '', // Not needed for this use case
                jobTitle: interview.job_title,
                date: interview.date,
                time: interview.time,
                type: interview.type,
                interviewer: interview.interviewer || ''
            }));
        },
        getCandidateFeedback: async (candidateId: string): Promise<InterviewFeedback[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify candidate belongs to user
            const { data: candidate } = await supabase
                .from('candidates')
                .select('id')
                .eq('id', candidateId)
                .eq('user_id', userId)
                .single();

            if (!candidate) throw new Error('Candidate not found');

            // Get all feedback for this candidate
            const { data: feedbackList, error } = await supabase
                .from('interview_feedback')
                .select(`
                    id,
                    interview_id,
                    candidate_id,
                    user_id,
                    overall_rating,
                    technical_skills,
                    communication,
                    cultural_fit,
                    problem_solving,
                    strengths,
                    weaknesses,
                    overall_impression,
                    recommendation,
                    created_at,
                    updated_at,
                    interviews!inner (
                        date,
                        time,
                        job_title
                    )
                `)
                .eq('candidate_id', candidateId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get user profiles for all feedback authors
            const userIds = [...new Set((feedbackList || []).map((f: any) => f.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .in('id', userIds);

            const profileMap = new Map((profiles || []).map((p: any) => [p.id, { name: p.name, avatarUrl: p.avatar_url }]));

            return (feedbackList || []).map((feedback: any) => {
                const profile = profileMap.get(feedback.user_id);
                return {
                    id: feedback.id,
                    interviewId: feedback.interview_id,
                    candidateId: feedback.candidate_id,
                    userId: feedback.user_id,
                    overallRating: feedback.overall_rating || undefined,
                    technicalSkills: feedback.technical_skills || undefined,
                    communication: feedback.communication || undefined,
                    culturalFit: feedback.cultural_fit || undefined,
                    problemSolving: feedback.problem_solving || undefined,
                    strengths: feedback.strengths || undefined,
                    weaknesses: feedback.weaknesses || undefined,
                    overallImpression: feedback.overall_impression || undefined,
                    recommendation: feedback.recommendation as any || undefined,
                    createdAt: feedback.created_at,
                    updatedAt: feedback.updated_at,
                    userName: profile?.name || 'Unknown',
                    userAvatarUrl: profile?.avatarUrl || undefined
                };
            });
        }
    },
    settings: {
        getPlan: async (): Promise<BillingPlan & { subscriptionStatus?: string; subscriptionStripeId?: string; subscriptionPeriodEnd?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                name: data?.billing_plan_name || 'Basic Plan',
                price: parseFloat(data?.billing_plan_price) || 0,
                interval: data?.billing_plan_interval || 'monthly',
                activeJobsLimit: data?.billing_plan_active_jobs_limit || 5,
                candidatesLimit: data?.billing_plan_candidates_limit || 50,
                currency: data?.billing_plan_currency || '$',
                subscriptionStatus: data?.subscription_status || null,
                subscriptionStripeId: data?.subscription_stripe_id || null,
                subscriptionPeriodEnd: data?.subscription_current_period_end || null
            };
        },
        getNotificationPreferences: async (): Promise<{
            emailNotifications: boolean;
            interviewScheduleUpdates: boolean;
            offerUpdates: boolean;
        }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_settings')
                .select('email_notifications, interview_schedule_updates, offer_updates')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                emailNotifications: data?.email_notifications ?? true,
                interviewScheduleUpdates: data?.interview_schedule_updates ?? true,
                offerUpdates: data?.offer_updates ?? true,
            };
        },
        updateNotificationPreferences: async (preferences: {
            emailNotifications?: boolean;
            interviewScheduleUpdates?: boolean;
            offerUpdates?: boolean;
        }): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (preferences.emailNotifications !== undefined) {
                updateData.email_notifications = preferences.emailNotifications;
            }
            if (preferences.interviewScheduleUpdates !== undefined) {
                updateData.interview_schedule_updates = preferences.interviewScheduleUpdates;
            }
            if (preferences.offerUpdates !== undefined) {
                updateData.offer_updates = preferences.offerUpdates;
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    ...updateData,
                }, {
                    onConflict: 'user_id',
                });

            if (error) throw error;
        },
        getComplianceSettings: async (): Promise<{
            dataRetentionPeriod: string;
            consentRequired: boolean;
        }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_settings')
                .select('data_retention_period, consent_required')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                dataRetentionPeriod: data?.data_retention_period || '6 months',
                consentRequired: data?.consent_required ?? true,
            };
        },
        updateComplianceSettings: async (settings: {
            dataRetentionPeriod?: string;
            consentRequired?: boolean;
        }): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (settings.dataRetentionPeriod !== undefined) {
                updateData.data_retention_period = settings.dataRetentionPeriod;
            }
            if (settings.consentRequired !== undefined) {
                updateData.consent_required = settings.consentRequired;
            }

            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    ...updateData,
                }, {
                    onConflict: 'user_id',
                });

            if (error) throw error;
        },
        getInvoices: async (): Promise<Invoice[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            try {
                // Call Supabase Edge Function to fetch invoices from Stripe
                const { data, error } = await supabase.functions.invoke('get-invoices', {
                    body: {},
                });

                // Handle non-2xx status codes gracefully
                if (error) {
                    // Silently handle errors - Edge Function may not be deployed or user may not have Stripe subscription
                    console.warn('Invoices Edge Function error (non-critical):', error.message || error);
                    return [];
                }

                // Handle case where data might be a string that needs parsing
                let responseData = data;
                if (typeof data === 'string') {
                    try {
                        responseData = JSON.parse(data);
                    } catch (e) {
                        console.warn('Failed to parse invoice data (non-critical):', e);
                        return [];
                    }
                }

                return responseData?.invoices || [];
            } catch (error: any) {
                // Silently handle all errors - invoices are optional feature
                // Edge Function may not be deployed, or user may not have Stripe account
                if (error?.message?.includes('non-2xx')) {
                    console.warn('Invoices Edge Function returned non-2xx status (non-critical)');
                } else {
                    console.warn('Error fetching invoices (non-critical):', error?.message || error);
                }
            return [];
            }
        },
        getBillingDetails: async (): Promise<{ subscription: any; paymentMethod: any }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            try {
                // Call Supabase Edge Function to fetch billing details from Stripe
                const { data, error } = await supabase.functions.invoke('get-billing-details', {
                    body: {},
                });

                // Handle both error object and non-2xx status codes gracefully
                if (error) {
                    // If it's a FunctionsHttpError (non-2xx status), try to parse the error body
                    if (error.message?.includes('non-2xx') || error.message?.includes('Edge Function')) {
                        console.warn('Billing Edge Function returned non-2xx status (may not be deployed or missing subscription):', error.message);
                        // Return null gracefully - this is expected if user has no subscription
                        return { subscription: null, paymentMethod: null };
                    }
                    console.error('Error fetching billing details:', error);
                    return { subscription: null, paymentMethod: null };
                }

                // Handle case where data might be a string that needs parsing
                let responseData = data;
                if (typeof data === 'string') {
                    try {
                        responseData = JSON.parse(data);
                    } catch (e) {
                        console.error('Failed to parse billing details:', e);
                        return { subscription: null, paymentMethod: null };
                    }
                }

                return {
                    subscription: responseData?.subscription || null,
                    paymentMethod: responseData?.paymentMethod || null,
                };
            } catch (error) {
                console.error('Error fetching billing details:', error);
                return { subscription: null, paymentMethod: null };
            }
        },
        getRecruitmentSettings: async (): Promise<RecruitmentSettings> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                maxActiveJobs: data?.max_active_jobs || 10,
                defaultJobDuration: data?.default_job_duration || 30,
                maxCandidatesPerJob: data?.max_candidates_per_job || 50,
                autoDeleteJobs: data?.auto_delete_jobs || false
            };
        },
        getTemplates: async (): Promise<EmailTemplate[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(template => ({
                id: template.id,
                title: template.title,
                desc: template.desc || '',
                type: template.type,
                subject: template.subject,
                content: template.content
            }));
        },
        updateTemplate: async (id: string, data: { subject?: string; content?: string }): Promise<EmailTemplate> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (data.subject !== undefined) updateData.subject = data.subject;
            if (data.content !== undefined) updateData.content = data.content;

            const { data: updated, error } = await supabase
                .from('email_templates')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: updated.id,
                title: updated.title,
                desc: updated.desc || '',
                type: updated.type,
                subject: updated.subject,
                content: updated.content
            };
        },
        getIntegrations: async (): Promise<Integration[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('integrations')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return (data || []).map(integration => ({
                id: integration.id,
                name: integration.name,
                desc: integration.desc || '',
                active: integration.active || false,
                logo: integration.logo || '',
                connectedDate: integration.connected_date
            }));
        },
        connectIntegration: async (integrationId: string): Promise<{ url: string; error?: string }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Teams integration is disabled
            if (integrationId === 'teams') {
                throw new Error('Microsoft Teams integration is currently unavailable.');
            }

            try {
                const { data, error } = await supabase.functions.invoke(
                    'connect-google',
                    {
                        body: { integrationId },
                    }
                );

                if (error) {
                    console.error('Error connecting integration:', error);
                    return { url: '', error: error.message || 'Failed to initiate connection' };
                }

                let responseData = data;
                if (typeof data === 'string') {
                    try {
                        responseData = JSON.parse(data);
                    } catch (e) {
                        console.error('Failed to parse integration response:', e);
                        return { url: '', error: 'Invalid response from server' };
                    }
                }

                return {
                    url: responseData?.url || '',
                    error: responseData?.error
                };
            } catch (error: any) {
                console.error('Error connecting integration:', error);
                return { url: '', error: error.message || 'Failed to connect integration' };
            }
        },
        disconnectIntegration: async (integrationId: string): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get integration name before disconnecting
            const { data: integration } = await supabase
                .from('integrations')
                .select('name')
                .eq('id', integrationId)
                .eq('user_id', userId)
                .single();

            const { error } = await supabase
                .from('integrations')
                .update({
                    active: false,
                    config: null,
                    connected_date: null
                })
                .eq('id', integrationId)
                .eq('user_id', userId);

            if (error) throw error;

            // Create notification for integration disconnected
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        title: 'Integration Disconnected',
                        desc: `${integration?.name || 'Integration'} has been disconnected from your account.`,
                        type: 'integration_disconnected',
                        category: 'system',
                        unread: true
                    });
            } catch (notifError) {
                console.error('Error creating integration disconnected notification:', notifError);
            }

            // Log activity
            if (integration?.name) {
                try {
                    const { logIntegrationDisconnected } = await import('./activityLogger');
                    await logIntegrationDisconnected(integration.name);
                } catch (error) {
                    console.error('Error logging integration disconnect activity:', error);
                }
            }
        }
    },
    plan: {
        /**
         * Check if plan allows AI email generation
         */
        canUseAiEmailGeneration: async (): Promise<boolean> => {
            const plan = await api.settings.getPlan();
            const limits = getPlanLimits(plan.name);
            return limits.aiEmailGeneration;
        },
        
        /**
         * Check if user can create a workflow
         */
        canCreateWorkflow: async (currentWorkflowCount: number): Promise<{ allowed: boolean; maxAllowed: number; message?: string }> => {
            const plan = await api.settings.getPlan();
            const limits = getPlanLimits(plan.name);
            const maxAllowed = limits.maxEmailWorkflows;
            
            if (currentWorkflowCount < maxAllowed) {
                return { allowed: true, maxAllowed };
            }
            
            const isTopPlan = limits.name === 'Professional';
            const message = isTopPlan
                ? `You've reached your maximum of ${maxAllowed} email workflows. Please delete an existing workflow or contact support for assistance.`
                : `Your ${limits.name} plan allows up to ${maxAllowed} email workflows. Upgrade to Professional for up to ${getPlanLimits('Professional').maxEmailWorkflows} workflows.`;
            
            return {
                allowed: false,
                maxAllowed,
                message
            };
        },
        
        /**
         * Check if user can export specified number of candidates
         */
        canExportCandidates: async (count: number): Promise<{ allowed: boolean; maxAllowed: number; message?: string }> => {
            const plan = await api.settings.getPlan();
            const limits = getPlanLimits(plan.name);
            const maxAllowed = limits.maxExportCandidates;
            
            if (count <= maxAllowed) {
                return { allowed: true, maxAllowed };
            }
            
            const isTopPlan = limits.name === 'Professional';
            const message = isTopPlan
                ? `Your plan allows up to ${maxAllowed} candidates per export. Please filter to fewer candidates or contact support for assistance.`
                : `Your ${limits.name} plan allows up to ${maxAllowed} candidates per export. Upgrade to Professional for up to ${getPlanLimits('Professional').maxExportCandidates} candidates per export.`;
            
            return {
                allowed: false,
                maxAllowed,
                message
            };
        },
        
        /**
         * Check if user has AI analysis quota remaining
         */
        hasAiAnalysisQuota: async (usedThisMonth: number): Promise<{ allowed: boolean; maxAllowed: number; remaining: number; message?: string }> => {
            const plan = await api.settings.getPlan();
            const limits = getPlanLimits(plan.name);
            const maxAllowed = limits.maxAiAnalysisPerMonth;
            const remaining = maxAllowed - usedThisMonth;
            
            if (remaining > 0) {
                return { allowed: true, maxAllowed, remaining };
            }
            
            const isTopPlan = limits.name === 'Professional';
            const message = isTopPlan
                ? `You've reached your monthly limit of ${maxAllowed} AI analyses. Your quota will reset next month.`
                : `Your ${limits.name} plan allows ${maxAllowed} AI analyses per month. Upgrade to Professional for ${getPlanLimits('Professional').maxAiAnalysisPerMonth} AI analyses per month.`;
            
            return {
                allowed: false,
                maxAllowed,
                remaining: 0,
                message
            };
        },
        
        /**
         * Get user's AI analysis usage for current month
         */
        getAiAnalysisUsage: async (): Promise<{ used: number; max: number; remaining: number }> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');
            
            const plan = await api.settings.getPlan();
            const limits = getPlanLimits(plan.name);
            
            // Get current month's usage from user_settings
            const { data } = await supabase
                .from('user_settings')
                .select('ai_analysis_count, ai_analysis_reset_date')
                .eq('user_id', userId)
                .single();
            
            const resetDate = data?.ai_analysis_reset_date ? new Date(data.ai_analysis_reset_date) : null;
            const now = new Date();
            
            // Reset if it's a new month
            let used = 0;
            if (resetDate && resetDate.getMonth() === now.getMonth() && resetDate.getFullYear() === now.getFullYear()) {
                used = data?.ai_analysis_count || 0;
            }
            
            const max = limits.maxAiAnalysisPerMonth;
            const remaining = Math.max(0, max - used);
            
            return { used, max, remaining };
        }
    },
    workflows: {
        list: async (): Promise<EmailWorkflow[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('email_workflows')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(workflow => ({
                id: workflow.id,
                userId: workflow.user_id,
                name: workflow.name,
                triggerStage: workflow.trigger_stage as CandidateStage,
                emailTemplateId: workflow.email_template_id,
                minMatchScore: workflow.min_match_score || undefined,
                sourceFilter: workflow.source_filter || undefined,
                enabled: workflow.enabled ?? true,
                delayMinutes: workflow.delay_minutes || 0,
                createdAt: workflow.created_at,
                updatedAt: workflow.updated_at
            }));
        },
        get: async (workflowId: string): Promise<EmailWorkflow> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('email_workflows')
                .select('*')
                .eq('id', workflowId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                triggerStage: data.trigger_stage as CandidateStage,
                emailTemplateId: data.email_template_id,
                minMatchScore: data.min_match_score || undefined,
                sourceFilter: data.source_filter || undefined,
                enabled: data.enabled ?? true,
                delayMinutes: data.delay_minutes || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        create: async (workflow: {
            name: string;
            triggerStage: CandidateStage;
            emailTemplateId: string;
            minMatchScore?: number;
            sourceFilter?: string[];
            enabled?: boolean;
            delayMinutes?: number;
        }): Promise<EmailWorkflow> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('email_workflows')
                .insert({
                    user_id: userId,
                    name: workflow.name,
                    trigger_stage: workflow.triggerStage,
                    email_template_id: workflow.emailTemplateId,
                    min_match_score: workflow.minMatchScore || null,
                    source_filter: workflow.sourceFilter || null,
                    enabled: workflow.enabled ?? true,
                    delay_minutes: workflow.delayMinutes || 0
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                triggerStage: data.trigger_stage as CandidateStage,
                emailTemplateId: data.email_template_id,
                minMatchScore: data.min_match_score || undefined,
                sourceFilter: data.source_filter || undefined,
                enabled: data.enabled ?? true,
                delayMinutes: data.delay_minutes || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        update: async (workflowId: string, updates: {
            name?: string;
            triggerStage?: CandidateStage;
            emailTemplateId?: string;
            minMatchScore?: number;
            sourceFilter?: string[];
            enabled?: boolean;
            delayMinutes?: number;
        }): Promise<EmailWorkflow> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.triggerStage !== undefined) updateData.trigger_stage = updates.triggerStage;
            if (updates.emailTemplateId !== undefined) updateData.email_template_id = updates.emailTemplateId;
            if (updates.minMatchScore !== undefined) updateData.min_match_score = updates.minMatchScore || null;
            if (updates.sourceFilter !== undefined) updateData.source_filter = updates.sourceFilter || null;
            if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
            if (updates.delayMinutes !== undefined) updateData.delay_minutes = updates.delayMinutes;

            const { data, error } = await supabase
                .from('email_workflows')
                .update(updateData)
                .eq('id', workflowId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                triggerStage: data.trigger_stage as CandidateStage,
                emailTemplateId: data.email_template_id,
                minMatchScore: data.min_match_score || undefined,
                sourceFilter: data.source_filter || undefined,
                enabled: data.enabled ?? true,
                delayMinutes: data.delay_minutes || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        delete: async (workflowId: string): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('email_workflows')
                .delete()
                .eq('id', workflowId)
                .eq('user_id', userId);

            if (error) throw error;
        },
        toggle: async (workflowId: string, enabled: boolean): Promise<EmailWorkflow> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('email_workflows')
                .update({ enabled })
                .eq('id', workflowId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                triggerStage: data.trigger_stage as CandidateStage,
                emailTemplateId: data.email_template_id,
                minMatchScore: data.min_match_score || undefined,
                sourceFilter: data.source_filter || undefined,
                enabled: data.enabled ?? true,
                delayMinutes: data.delay_minutes || 0,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        test: async (workflowId: string, candidateId: string, testPlaceholders?: Record<string, string>): Promise<void> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get workflow (testing works even if workflow is disabled)
            const workflow = await api.workflows.get(workflowId);
            
            // Get user email
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) {
                throw new Error('User email not found');
            }

            // Get email template
            const { data: template, error: templateError } = await supabase
                .from('email_templates')
                .select('*')
                .eq('id', workflow.emailTemplateId)
                .eq('user_id', userId)
                .single();

            if (templateError || !template) {
                throw new Error(`Email template not found: ${templateError?.message}`);
            }

            // Get user profile for your_name placeholder (but always use "Recruiter" as sender)
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', userId)
                .single();

            const senderName = 'Recruiter'; // Always use "Recruiter" as sender name

            // Replace placeholders in template with test values (if provided) or defaults
            // Default test placeholder values
            const defaultTestPlaceholders: Record<string, string> = {
                candidate_name: 'John Doe',
                job_title: 'Software Engineer',
                position_title: 'Software Engineer',
                company_name: 'Our Company',
                your_name: profile?.name || 'Recruiter',
                interviewer_name: profile?.name || 'Interviewer',
                interview_date: 'Monday, January 15, 2024',
                interview_time: '10:00 AM',
                interview_duration: '1 hour',
                interview_type: 'Video Call',
                interview_details: 'Date: Monday, January 15, 2024\nTime: 10:00 AM\nDuration: 1 hour\nType: Video Call',
                meeting_link: 'https://meet.google.com/xxx-yyyy-zzz',
                address: '123 Main St, City, State 12345',
                previous_interview_time: 'Monday, January 8, 2024 at 2:00 PM',
                new_interview_time: 'Monday, January 15, 2024 at 10:00 AM',
                old_interview_date: 'Monday, January 8, 2024',
                old_interview_time: '2:00 PM',
                salary: '$100,000 per year',
                salary_amount: '100000',
                salary_currency: 'USD',
                salary_period: 'per year',
                start_date: 'February 1, 2024',
                expires_at: 'January 31, 2024',
                benefits: 'Health insurance, 401k, Paid time off',
                benefits_list: '• Health insurance\n• 401k\n• Paid time off',
                notes: 'We are excited to have you join our team!',
                offer_response_link: 'https://coreflowhr.com/offers/respond/test-token'
            };

            // Merge user-provided test placeholders with defaults (user values take precedence)
            const mergedPlaceholders = { ...defaultTestPlaceholders, ...(testPlaceholders || {}) };

            // Replace placeholders in subject and content
            let subject = template.subject;
            let content = template.content;

            // Replace all placeholders in curly braces format {placeholder_name}
            Object.keys(mergedPlaceholders).forEach(key => {
                const placeholder = `{${key}}`;
                const value = mergedPlaceholders[key];
                subject = subject.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
                content = content.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
            });

            // Add [TEST] prefix to subject
            subject = `[TEST] ${subject}`;

            // Send test email to user
            const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                    to: user.email,
                    subject: subject,
                    content: content,
                    fromName: senderName,
                    candidateId: null, // No candidate for test
                    emailType: 'Custom'
                }
            });

            if (emailError) {
                throw new Error(`Failed to send test email: ${emailError.message}`);
            }

            // Skip creating execution log for test workflows
            // Test workflows don't have a real candidate_id, and we don't want to pollute
            // the execution history with test runs. Test emails are sent directly to the user.
            // If a valid candidateId is provided, we could log it, but for now we skip logging tests.
            // Note: The candidateId parameter is currently unused but kept for future use
        },
        getExecutions: async (workflowId: string): Promise<WorkflowExecution[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Verify workflow belongs to user
            await api.workflows.get(workflowId);

            const { data, error } = await supabase
                .from('workflow_executions')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('executed_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            return (data || []).map(execution => ({
                id: execution.id,
                workflowId: execution.workflow_id,
                candidateId: execution.candidate_id,
                emailLogId: execution.email_log_id || undefined,
                status: execution.status as 'pending' | 'sent' | 'failed' | 'skipped',
                executedAt: execution.executed_at,
                errorMessage: execution.error_message || undefined
            }));
        }
    },
    offers: {
        list: async (filters?: { status?: Offer['status']; candidateId?: string; jobId?: string; generalOnly?: boolean }): Promise<Offer[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            let query = supabase
                .from('offers')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.candidateId) {
                query = query.eq('candidate_id', filters.candidateId);
            } else if (filters?.generalOnly) {
                // Filter for general offers (no candidate linked)
                query = query.is('candidate_id', null);
            }
            if (filters?.jobId) {
                query = query.eq('job_id', filters.jobId);
            }

            const { data, error } = await query;

            if (error) throw error;

            return (data || []).map(offer => ({
                id: offer.id,
                candidateId: offer.candidate_id,
                jobId: offer.job_id,
                userId: offer.user_id,
                positionTitle: offer.position_title,
                startDate: offer.start_date || undefined,
                salaryAmount: offer.salary_amount ? parseFloat(offer.salary_amount) : undefined,
                salaryCurrency: offer.salary_currency || 'USD',
                salaryPeriod: offer.salary_period || 'yearly',
                benefits: offer.benefits || undefined,
                notes: offer.notes || undefined,
                status: offer.status as Offer['status'],
                sentAt: offer.sent_at || undefined,
                viewedAt: offer.viewed_at || undefined,
                respondedAt: offer.responded_at || undefined,
                expiresAt: offer.expires_at || undefined,
                response: offer.response || undefined,
                negotiationHistory: offer.negotiation_history || undefined,
                createdAt: offer.created_at,
                updatedAt: offer.updated_at
            }));
        },
        get: async (offerId: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('id', offerId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return {
                id: data.id,
                candidateId: data.candidate_id,
                jobId: data.job_id,
                userId: data.user_id,
                positionTitle: data.position_title,
                startDate: data.start_date || undefined,
                salaryAmount: data.salary_amount ? parseFloat(data.salary_amount) : undefined,
                salaryCurrency: data.salary_currency || 'USD',
                salaryPeriod: data.salary_period || 'yearly',
                benefits: data.benefits || undefined,
                notes: data.notes || undefined,
                status: data.status as Offer['status'],
                sentAt: data.sent_at || undefined,
                viewedAt: data.viewed_at || undefined,
                respondedAt: data.responded_at || undefined,
                expiresAt: data.expires_at || undefined,
                response: data.response || undefined,
                negotiationHistory: data.negotiation_history || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        create: async (offerData: {
            candidateId?: string | null; // Optional for general offers
            jobId: string;
            positionTitle: string;
            startDate?: string;
            salaryAmount?: number;
            salaryCurrency?: string;
            salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
            benefits?: string[];
            notes?: string;
            expiresAt?: string;
        }): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('offers')
                .insert({
                    user_id: userId,
                    candidate_id: offerData.candidateId || null, // Allow null for general offers
                    job_id: offerData.jobId,
                    position_title: offerData.positionTitle,
                    start_date: offerData.startDate || null,
                    salary_amount: offerData.salaryAmount || null,
                    salary_currency: offerData.salaryCurrency || 'USD',
                    salary_period: offerData.salaryPeriod || 'yearly',
                    benefits: offerData.benefits || null,
                    notes: offerData.notes || null,
                    status: 'draft',
                    expires_at: offerData.expiresAt || null
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                candidateId: data.candidate_id, // Can be null
                jobId: data.job_id,
                userId: data.user_id,
                positionTitle: data.position_title,
                startDate: data.start_date || undefined,
                salaryAmount: data.salary_amount ? parseFloat(data.salary_amount) : undefined,
                salaryCurrency: data.salary_currency || 'USD',
                salaryPeriod: data.salary_period || 'yearly',
                benefits: data.benefits || undefined,
                notes: data.notes || undefined,
                status: data.status as Offer['status'],
                sentAt: data.sent_at || undefined,
                viewedAt: data.viewed_at || undefined,
                respondedAt: data.responded_at || undefined,
                expiresAt: data.expires_at || undefined,
                response: data.response || undefined,
                negotiationHistory: data.negotiation_history || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        linkToCandidate: async (offerId: string, candidateId: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get the offer first to check if it's a general offer
            const offer = await api.offers.get(offerId);
            if (offer.candidateId) {
                throw new Error('This offer is already linked to a candidate');
            }

            // Update the offer with the candidate
            const { data, error } = await supabase
                .from('offers')
                .update({ candidate_id: candidateId })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                candidateId: data.candidate_id,
                jobId: data.job_id,
                userId: data.user_id,
                positionTitle: data.position_title,
                startDate: data.start_date || undefined,
                salaryAmount: data.salary_amount ? parseFloat(data.salary_amount) : undefined,
                salaryCurrency: data.salary_currency || 'USD',
                salaryPeriod: data.salary_period || 'yearly',
                benefits: data.benefits || undefined,
                notes: data.notes || undefined,
                status: data.status as Offer['status'],
                sentAt: data.sent_at || undefined,
                viewedAt: data.viewed_at || undefined,
                respondedAt: data.responded_at || undefined,
                expiresAt: data.expires_at || undefined,
                response: data.response || undefined,
                negotiationHistory: data.negotiation_history || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        update: async (offerId: string, updates: Partial<{
            positionTitle: string;
            startDate: string;
            salaryAmount: number;
            salaryCurrency: string;
            salaryPeriod: 'hourly' | 'monthly' | 'yearly';
            benefits: string[];
            notes: string;
            expiresAt: string;
            candidateId?: string | null; // Allow updating candidate_id
        }>): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const updateData: any = {};
            if (updates.positionTitle !== undefined) updateData.position_title = updates.positionTitle;
            if (updates.startDate !== undefined) updateData.start_date = updates.startDate || null;
            if (updates.salaryAmount !== undefined) updateData.salary_amount = updates.salaryAmount || null;
            if (updates.salaryCurrency !== undefined) updateData.salary_currency = updates.salaryCurrency;
            if (updates.salaryPeriod !== undefined) updateData.salary_period = updates.salaryPeriod;
            if (updates.benefits !== undefined) updateData.benefits = updates.benefits || null;
            if (updates.notes !== undefined) updateData.notes = updates.notes || null;
            if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt || null;
            if (updates.candidateId !== undefined) updateData.candidate_id = updates.candidateId || null;

            const { data, error } = await supabase
                .from('offers')
                .update(updateData)
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                candidateId: data.candidate_id,
                jobId: data.job_id,
                userId: data.user_id,
                positionTitle: data.position_title,
                startDate: data.start_date || undefined,
                salaryAmount: data.salary_amount ? parseFloat(data.salary_amount) : undefined,
                salaryCurrency: data.salary_currency || 'USD',
                salaryPeriod: data.salary_period || 'yearly',
                benefits: data.benefits || undefined,
                notes: data.notes || undefined,
                status: data.status as Offer['status'],
                sentAt: data.sent_at || undefined,
                viewedAt: data.viewed_at || undefined,
                respondedAt: data.responded_at || undefined,
                expiresAt: data.expires_at || undefined,
                response: data.response || undefined,
                negotiationHistory: data.negotiation_history || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        send: async (offerId: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get offer
            const offer = await api.offers.get(offerId);

            // Check if offer is linked to a candidate
            if (!offer.candidateId) {
                throw new Error('Cannot send a general offer. Please link it to a candidate first.');
            }

            // Check if Offer workflow is configured before allowing offer to be sent
            // Since sending an offer automatically moves candidate to Offer stage, workflow must be configured
            const { data: workflows, error: workflowCheckError } = await supabase
                .from('email_workflows')
                .select('id')
                .eq('user_id', userId)
                .eq('trigger_stage', 'Offer')
                .eq('enabled', true)
                .limit(1);
            
            if (workflowCheckError) {
                throw new Error(`Error checking workflows: ${workflowCheckError.message}`);
            }
            
            if (!workflows || workflows.length === 0) {
                throw new Error('Cannot send offer. Please create an email workflow for the "Offer" stage in Settings > Email Workflows first.');
            }

            // Get candidate - use list and find, as there's no direct get method
            const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1000 });
            const candidates = candidatesResult.data || [];
            const candidate = candidates.find(c => c.id === offer.candidateId);
            if (!candidate) {
                throw new Error('Candidate not found');
            }
            if (!candidate.email) {
                throw new Error('Candidate does not have an email address');
            }

            // Get job
            const job = await api.jobs.get(offer.jobId);
            const companyName = job.company || 'Our Company';

            // Get offer email template
            let template;
            const { data: templateData, error: templateError } = await supabase
                .from('email_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('type', 'Offer')
                .single();

            if (templateError || !templateData) {
                // Use default template with all placeholders (notes removed as per user request)
                template = {
                    subject: 'Job Offer – {position_title} at {company_name}',
                    content: `Dear {candidate_name},\n\nWe are delighted to extend a job offer for the {position_title} position at {company_name}.\n\nPosition: {position_title}\nSalary: {salary}\nStart Date: {start_date}\nExpires: {expires_at}\n\n{benefits}\n\nPlease review the offer details and let us know your decision.\n\nBest regards,\n{company_name}`
                };
            } else {
                template = templateData;
            }

            // Format salary
            let salaryText = '';
            let salaryAmountText = '';
            let salaryCurrencyText = '';
            let salaryPeriodText = '';
            if (offer.salaryAmount) {
                salaryAmountText = offer.salaryAmount.toLocaleString();
                salaryCurrencyText = offer.salaryCurrency === 'USD' ? '$' : offer.salaryCurrency;
                salaryPeriodText = offer.salaryPeriod === 'yearly' ? 'per year' : offer.salaryPeriod === 'monthly' ? 'per month' : 'per hour';
                salaryText = `${salaryCurrencyText}${salaryAmountText} ${salaryPeriodText}`;
            } else {
                salaryText = 'To be discussed';
                salaryAmountText = 'TBD';
                salaryCurrencyText = '';
                salaryPeriodText = '';
            }

            // Format benefits
            let benefitsText = '';
            let benefitsList = '';
            if (offer.benefits && offer.benefits.length > 0) {
                benefitsList = offer.benefits.map(b => `• ${b}`).join('\n');
                benefitsText = `Benefits:\n${benefitsList}`;
            } else {
                benefitsText = '';
                benefitsList = 'None specified';
            }

            // Format dates
            const startDateText = offer.startDate 
                ? new Date(offer.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'To be determined';
            const expiresAtText = offer.expiresAt
                ? new Date(offer.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'No expiration date';

            // Get user profile for your_name placeholder
            const { data: profile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', userId)
                .single();
            
            const userName = profile?.name || 'Recruiter';

            // Replace template variables in subject
            let subject = template.subject
                .replace(/{candidate_name}/g, candidate.name)
                .replace(/{position_title}/g, offer.positionTitle)
                .replace(/{company_name}/g, companyName)
                .replace(/{job_title}/g, offer.positionTitle)
                .replace(/{salary}/g, salaryText)
                .replace(/{salary_amount}/g, salaryAmountText)
                .replace(/{salary_currency}/g, salaryCurrencyText)
                .replace(/{salary_period}/g, salaryPeriodText)
                .replace(/{start_date}/g, startDateText)
                .replace(/{expires_at}/g, expiresAtText)
                .replace(/{your_name}/g, userName);

            // Generate secure token for offer response
            const { generateSecureToken } = await import('./tokenUtils');
            const offerToken = generateSecureToken(32);
            
            // Calculate expiration (60 days from now)
            const tokenExpiresAt = new Date();
            tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);
            
            // Build offer response link
            // Always use production URL for email links (never localhost)
            // window.location.origin is only checked if we're in browser AND not localhost
            const frontendUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
                ? window.location.origin 
                : 'https://www.coreflowhr.com';
            const offerResponseLink = `${frontendUrl}/offers/respond/${offerToken}`;
            
            // Replace template variables in content (notes placeholder removed from default, but still available if user adds it to template)
            let content = template.content
                .replace(/{candidate_name}/g, candidate.name)
                .replace(/{position_title}/g, offer.positionTitle)
                .replace(/{company_name}/g, companyName)
                .replace(/{job_title}/g, offer.positionTitle)
                .replace(/{salary}/g, salaryText)
                .replace(/{salary_amount}/g, salaryAmountText)
                .replace(/{salary_currency}/g, salaryCurrencyText)
                .replace(/{salary_period}/g, salaryPeriodText)
                .replace(/{start_date}/g, startDateText)
                .replace(/{expires_at}/g, expiresAtText)
                .replace(/{benefits}/g, benefitsText)
                .replace(/{benefits_list}/g, benefitsList)
                .replace(/{notes}/g, offer.notes || '') // Notes placeholder still works if user adds it to template
                .replace(/{your_name}/g, userName);
            
            // Add offer response link - smart injection similar to CV upload links
            const clickableLink = `<a href="${offerResponseLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">View and Respond to Offer</a>`;
            const responseSection = `\n\n---\n\nPlease click the link below to view the full offer details and accept or decline:\n${clickableLink}`;
            
            if (content.includes('{offer_response_link}')) {
                // User has placed the variable - replace it with clickable link
                content = content.replace(/{offer_response_link}/g, clickableLink);
            } else {
                // Variable not found - append response section at the bottom
                content = content + responseSection;
            }

            // Send email
            const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                    to: candidate.email,
                    subject: subject,
                    content: content,
                    fromName: 'Recruiter', // Always use "Recruiter" as sender name
                    candidateId: candidate.id,
                    emailType: 'Offer'
                }
            });

            if (emailError) {
                throw new Error(`Failed to send offer email: ${emailError.message}`);
            }

            // Update offer status to 'sent' and store token
            const { data: updated, error: updateError } = await supabase
                .from('offers')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    offer_token: offerToken,
                    offer_token_expires_at: tokenExpiresAt.toISOString()
                })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) throw updateError;

            // Automatically move candidate to Offer stage when offer is sent
            // Do this directly via database update to bypass workflow checks (since we're already sending the offer email)
            try {
                // Get current stage and name for logging before update
                const { data: candidateBeforeUpdate } = await supabase
                    .from('candidates')
                    .select('stage, name')
                    .eq('id', offer.candidateId)
                    .eq('user_id', userId)
                    .single();

                const oldStage = candidateBeforeUpdate?.stage;
                const candidateName = candidateBeforeUpdate?.name;

                // Update candidate stage to Offer
                const { error: stageUpdateError } = await supabase
                    .from('candidates')
                    .update({ stage: 'Offer' })
                    .eq('id', offer.candidateId)
                    .eq('user_id', userId);

                if (stageUpdateError) {
                    console.error('Error updating candidate stage to Offer:', stageUpdateError);
                    // Don't throw - offer was sent successfully, stage update is secondary
                } else if (oldStage && oldStage !== 'Offer' && candidateName) {
                    // Log the stage change activity (only if stage actually changed)
                    try {
                        const { logCandidateMoved } = await import('./activityLogger');
                        await logCandidateMoved(candidateName, oldStage as CandidateStage, CandidateStage.OFFER);
                    } catch (logError) {
                        console.error('Error logging candidate stage change:', logError);
                        // Don't throw - logging is non-critical
                    }
                }
            } catch (stageError: any) {
                // Log error but don't fail the offer send if stage update fails
                console.error('Error updating candidate stage to Offer:', stageError);
                // Don't throw - offer was sent successfully
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        accept: async (offerId: string, response?: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const offer = await api.offers.get(offerId);

            // Update offer status
            const { data: updated, error } = await supabase
                .from('offers')
                .update({
                    status: 'accepted',
                    responded_at: new Date().toISOString(),
                    response: response || null
                })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Move candidate to Hired stage
            try {
                await api.candidates.update(offer.candidateId, {
                    stage: CandidateStage.HIRED
                });
            } catch (stageError) {
                console.error('Error moving candidate to Hired stage:', stageError);
                // Don't fail the offer acceptance if stage update fails
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        decline: async (offerId: string, response?: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: updated, error } = await supabase
                .from('offers')
                .update({
                    status: 'declined',
                    responded_at: new Date().toISOString(),
                    response: response || null
                })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        negotiate: async (offerId: string, negotiationData: { notes: string; updatedFields?: any }): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const offer = await api.offers.get(offerId);
            const history = offer.negotiationHistory || [];
            
            // Add negotiation round
            history.push({
                timestamp: new Date().toISOString(),
                notes: negotiationData.notes,
                updatedFields: negotiationData.updatedFields || {}
            });

            // Update offer with negotiation
            const updateData: any = {
                status: 'negotiating',
                negotiation_history: history
            };

            // Update any fields if provided
            if (negotiationData.updatedFields) {
                if (negotiationData.updatedFields.salaryAmount !== undefined) {
                    updateData.salary_amount = negotiationData.updatedFields.salaryAmount;
                }
                if (negotiationData.updatedFields.benefits !== undefined) {
                    updateData.benefits = negotiationData.updatedFields.benefits;
                }
                if (negotiationData.updatedFields.startDate !== undefined) {
                    updateData.start_date = negotiationData.updatedFields.startDate;
                }
            }

            const { data: updated, error } = await supabase
                .from('offers')
                .update(updateData)
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        acceptCounterOffer: async (offerId: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get offer
            const offer = await api.offers.get(offerId);

            if (offer.status !== 'negotiating') {
                throw new Error('Offer is not in negotiating status');
            }

            // Get latest counter offer from negotiation history
            const counterOffer = offer.negotiationHistory
                ?.filter((item: any) => item.type === 'counter_offer')
                .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

            if (!counterOffer || !counterOffer.counterOffer) {
                throw new Error('No counter offer found');
            }

            const co = counterOffer.counterOffer;

            // Update offer with counter offer terms
            const updateData: any = {
                status: 'accepted',
                responded_at: new Date().toISOString()
            };

            // Apply counter offer terms
            if (co.salaryAmount !== undefined) {
                updateData.salary_amount = co.salaryAmount;
                updateData.salary_currency = co.salaryCurrency || offer.salaryCurrency;
                updateData.salary_period = co.salaryPeriod || offer.salaryPeriod;
            }
            if (co.startDate !== undefined) {
                updateData.start_date = co.startDate;
            }
            if (co.benefits !== undefined) {
                updateData.benefits = co.benefits;
            }

            // Add acceptance to negotiation history
            const history = offer.negotiationHistory || [];
            history.push({
                timestamp: new Date().toISOString(),
                type: 'counter_offer_accepted',
                notes: 'Counter offer accepted by recruiter'
            });

            updateData.negotiation_history = history;

            // Update offer
            const { data: updated, error } = await supabase
                .from('offers')
                .update(updateData)
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Get candidate
            if (offer.candidateId) {
                const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1000 });
                const candidates = candidatesResult.data || [];
                const candidate = candidates.find(c => c.id === offer.candidateId);
                
                if (candidate && candidate.email) {
                    // Get job
                    const job = await api.jobs.get(offer.jobId);
                    const companyName = job.company || 'Our Company';

                    // Get email template
                    const { data: templateData } = await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('type', 'Offer Accepted')
                        .single();

                    let template = templateData || {
                        subject: 'Counter Offer Accepted – {position_title} at {company_name}',
                        content: 'Dear {candidate_name},\n\nWe are pleased to inform you that we have accepted your counter offer for the {position_title} position at {company_name}!\n\nFinal Offer Details:\nPosition: {position_title}\nSalary: {salary} ({salary_amount} {salary_currency} {salary_period})\nStart Date: {start_date}\nExpires: {expires_at}\n\nBenefits:\n{benefits_list}\n\nWe are excited to move forward with these terms and look forward to welcoming you to {company_name}!\n\nBest regards,\n{your_name}\n{company_name}'
                    };

                    // Get user profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', userId)
                        .single();
                    const userName = profile?.name || 'Recruiter';

                    // Format salary
                    const finalSalaryAmount = co.salaryAmount || offer.salaryAmount || 0;
                    const finalCurrency = co.salaryCurrency || offer.salaryCurrency || 'USD';
                    const finalPeriod = co.salaryPeriod || offer.salaryPeriod || 'yearly';
                    const currencySymbol = finalCurrency === 'USD' ? '$' : finalCurrency;
                    const periodText = finalPeriod === 'yearly' ? 'per year' : finalPeriod === 'monthly' ? 'per month' : 'per hour';
                    const salaryText = `${currencySymbol}${finalSalaryAmount.toLocaleString()} ${periodText}`;

                    // Format benefits
                    const finalBenefits = co.benefits || offer.benefits || [];
                    const benefitsList = finalBenefits.length > 0 
                        ? finalBenefits.map((b: string) => `• ${b}`).join('\n')
                        : 'Standard benefits package';

                    // Format dates
                    const finalStartDate = co.startDate || offer.startDate;
                    const startDateText = finalStartDate
                        ? new Date(finalStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'To be determined';
                    const expiresAtText = offer.expiresAt
                        ? new Date(offer.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'No expiration date';

                    // Replace template variables
                    let subject = template.subject
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, updated.position_title)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, updated.position_title);

                    let content = template.content
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, updated.position_title)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, updated.position_title)
                        .replace(/{salary}/g, salaryText)
                        .replace(/{salary_amount}/g, finalSalaryAmount.toLocaleString())
                        .replace(/{salary_currency}/g, finalCurrency)
                        .replace(/{salary_period}/g, periodText)
                        .replace(/{start_date}/g, startDateText)
                        .replace(/{expires_at}/g, expiresAtText)
                        .replace(/{benefits_list}/g, benefitsList)
                        .replace(/{your_name}/g, userName);

                    // Send email
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: candidate.email,
                            subject: subject,
                            content: content,
                            fromName: 'Recruiter',
                            candidateId: candidate.id,
                            emailType: 'Offer Accepted'
                        }
                    });
                }
            }

            // Move candidate to Hired stage if offer accepted
            if (offer.candidateId) {
                try {
                    await api.candidates.update(offer.candidateId, { stage: CandidateStage.HIRED });
                } catch (stageError) {
                    console.error('Error updating candidate stage:', stageError);
                    // Don't throw - offer acceptance is more important
                }
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        declineCounterOffer: async (offerId: string, notes?: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get offer
            const offer = await api.offers.get(offerId);

            if (offer.status !== 'negotiating') {
                throw new Error('Offer is not in negotiating status');
            }

            // Add decline to negotiation history
            const history = offer.negotiationHistory || [];
            history.push({
                timestamp: new Date().toISOString(),
                type: 'counter_offer_declined',
                notes: notes || 'Counter offer declined by recruiter'
            });

            // Revert to original offer terms (status goes back to 'sent')
            const { data: updated, error } = await supabase
                .from('offers')
                .update({
                    status: 'sent',
                    negotiation_history: history
                })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Get candidate and send decline email
            if (offer.candidateId) {
                const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1000 });
                const candidates = candidatesResult.data || [];
                const candidate = candidates.find(c => c.id === offer.candidateId);
                
                if (candidate && candidate.email) {
                    // Get job
                    const job = await api.jobs.get(offer.jobId);
                    const companyName = job.company || 'Our Company';

                    // Get email template
                    const { data: templateData } = await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('type', 'Offer Declined')
                        .single();

                    let template = templateData || {
                        subject: 'Counter Offer Update – {position_title} at {company_name}',
                        content: 'Dear {candidate_name},\n\nThank you for your counter offer regarding the {position_title} position at {company_name}.\n\nAfter careful consideration, we are unable to accept the terms of your counter offer at this time. However, our original offer of {salary} ({salary_amount} {salary_currency} {salary_period}) remains available if you would like to proceed.\n\nWe understand this may be disappointing, and we appreciate your interest in joining {company_name}. If you have any questions or would like to discuss further, please don\'t hesitate to reach out.\n\nBest regards,\n{your_name}\n{company_name}'
                    };

                    // Get user profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', userId)
                        .single();
                    const userName = profile?.name || 'Recruiter';

                    // Format salary (original offer)
                    const salaryAmount = offer.salaryAmount || 0;
                    const currency = offer.salaryCurrency || 'USD';
                    const period = offer.salaryPeriod || 'yearly';
                    const currencySymbol = currency === 'USD' ? '$' : currency;
                    const periodText = period === 'yearly' ? 'per year' : period === 'monthly' ? 'per month' : 'per hour';
                    const salaryText = `${currencySymbol}${salaryAmount.toLocaleString()} ${periodText}`;

                    // Replace template variables
                    let subject = template.subject
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, offer.positionTitle)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, offer.positionTitle);

                    let content = template.content
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, offer.positionTitle)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, offer.positionTitle)
                        .replace(/{salary}/g, salaryText)
                        .replace(/{salary_amount}/g, salaryAmount.toLocaleString())
                        .replace(/{salary_currency}/g, currency)
                        .replace(/{salary_period}/g, periodText)
                        .replace(/{your_name}/g, userName);

                    // Send email
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: candidate.email,
                            subject: subject,
                            content: content,
                            fromName: 'Recruiter',
                            candidateId: candidate.id,
                            emailType: 'Offer Declined'
                        }
                    });
                }
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        respondToCounterOffer: async (offerId: string, updatedFields: {
            salaryAmount?: number;
            salaryCurrency?: string;
            salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
            startDate?: string;
            benefits?: string[];
            notes?: string;
        }): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            // Get offer
            const offer = await api.offers.get(offerId);

            if (offer.status !== 'negotiating') {
                throw new Error('Offer is not in negotiating status');
            }

            // Update offer with new terms
            const updateData: any = {
                status: 'negotiating'
            };

            if (updatedFields.salaryAmount !== undefined) {
                updateData.salary_amount = updatedFields.salaryAmount;
            }
            if (updatedFields.salaryCurrency !== undefined) {
                updateData.salary_currency = updatedFields.salaryCurrency;
            }
            if (updatedFields.salaryPeriod !== undefined) {
                updateData.salary_period = updatedFields.salaryPeriod;
            }
            if (updatedFields.startDate !== undefined) {
                updateData.start_date = updatedFields.startDate;
            }
            if (updatedFields.benefits !== undefined) {
                updateData.benefits = updatedFields.benefits;
            }

            // Add negotiation response to history
            const history = offer.negotiationHistory || [];
            history.push({
                timestamp: new Date().toISOString(),
                type: 'counter_offer_response',
                updatedFields: updatedFields,
                notes: updatedFields.notes || 'Recruiter responded with updated terms'
            });

            updateData.negotiation_history = history;

            // Update offer
            const { data: updated, error } = await supabase
                .from('offers')
                .update(updateData)
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Get candidate and send negotiation response email
            if (offer.candidateId) {
                const candidatesResult = await api.candidates.list({ page: 1, pageSize: 1000 });
                const candidates = candidatesResult.data || [];
                const candidate = candidates.find(c => c.id === offer.candidateId);
                
                if (candidate && candidate.email) {
                    // Get job
                    const job = await api.jobs.get(offer.jobId);
                    const companyName = job.company || 'Our Company';

                    // Get email template
                    const { data: templateData } = await supabase
                        .from('email_templates')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('type', 'Counter Offer Response')
                        .single();

                    let template = templateData || {
                        subject: 'Updated Offer Terms – {position_title} at {company_name}',
                        content: 'Dear {candidate_name},\n\nThank you for your counter offer. We appreciate your interest in the {position_title} position at {company_name}.\n\nAfter reviewing your request, we would like to propose the following updated terms:\n\nUpdated Offer Details:\nPosition: {position_title}\nSalary: {salary} ({salary_amount} {salary_currency} {salary_period})\nStart Date: {start_date}\nExpires: {expires_at}\n\nBenefits:\n{benefits_list}\n\n{notes}\n\nWe hope these terms work for you. Please let us know if you would like to proceed or if you have any further questions.\n\nBest regards,\n{your_name}\n{company_name}'
                    };

                    // Get user profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('name')
                        .eq('id', userId)
                        .single();
                    const userName = profile?.name || 'Recruiter';

                    // Format salary (updated terms)
                    const finalSalaryAmount = updatedFields.salaryAmount !== undefined ? updatedFields.salaryAmount : (offer.salaryAmount || 0);
                    const finalCurrency = updatedFields.salaryCurrency || offer.salaryCurrency || 'USD';
                    const finalPeriod = updatedFields.salaryPeriod || offer.salaryPeriod || 'yearly';
                    const currencySymbol = finalCurrency === 'USD' ? '$' : finalCurrency;
                    const periodText = finalPeriod === 'yearly' ? 'per year' : finalPeriod === 'monthly' ? 'per month' : 'per hour';
                    const salaryText = `${currencySymbol}${finalSalaryAmount.toLocaleString()} ${periodText}`;

                    // Format benefits
                    const finalBenefits = updatedFields.benefits || offer.benefits || [];
                    const benefitsList = finalBenefits.length > 0 
                        ? finalBenefits.map((b: string) => `• ${b}`).join('\n')
                        : 'Standard benefits package';

                    // Format dates
                    const finalStartDate = updatedFields.startDate || offer.startDate;
                    const startDateText = finalStartDate
                        ? new Date(finalStartDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'To be determined';
                    const expiresAtText = offer.expiresAt
                        ? new Date(offer.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : 'No expiration date';

                    // Replace template variables
                    let subject = template.subject
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, updated.position_title)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, updated.position_title);

                    let content = template.content
                        .replace(/{candidate_name}/g, candidate.name)
                        .replace(/{position_title}/g, updated.position_title)
                        .replace(/{company_name}/g, companyName)
                        .replace(/{job_title}/g, updated.position_title)
                        .replace(/{salary}/g, salaryText)
                        .replace(/{salary_amount}/g, finalSalaryAmount.toLocaleString())
                        .replace(/{salary_currency}/g, finalCurrency)
                        .replace(/{salary_period}/g, periodText)
                        .replace(/{start_date}/g, startDateText)
                        .replace(/{expires_at}/g, expiresAtText)
                        .replace(/{benefits_list}/g, benefitsList)
                        .replace(/{notes}/g, updatedFields.notes || '')
                        .replace(/{your_name}/g, userName);

                    // Generate new offer token for response link
                    const { generateSecureToken } = await import('./tokenUtils');
                    const offerToken = generateSecureToken(32);
                    const tokenExpiresAt = new Date();
                    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 60);

                    await supabase
                        .from('offers')
                        .update({
                            offer_token: offerToken,
                            offer_token_expires_at: tokenExpiresAt.toISOString()
                        })
                        .eq('id', offerId);

                    // Build offer response link
                    // Always use production URL for email links (never localhost)
                    const frontendUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
                        ? window.location.origin 
                        : 'https://www.coreflowhr.com';
                    const offerResponseLink = `${frontendUrl}/offers/respond/${offerToken}`;

                    // Add response link to email
                    const clickableLink = `<a href="${offerResponseLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">View and Respond to Offer</a>`;
                    const responseSection = `\n\n---\n\nPlease click the link below to view the updated offer details and respond:\n${clickableLink}`;
                    
                    if (!content.includes('{offer_response_link}')) {
                        content = content + responseSection;
                    } else {
                        content = content.replace(/{offer_response_link}/g, clickableLink);
                    }

                    // Send email
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: candidate.email,
                            subject: subject,
                            content: content,
                            fromName: 'Recruiter',
                            candidateId: candidate.id,
                            emailType: 'Counter Offer Response'
                        }
                    });
                }
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        expire: async (offerId: string): Promise<Offer> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data: updated, error } = await supabase
                .from('offers')
                .update({
                    status: 'expired'
                })
                .eq('id', offerId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        getTemplates: async (): Promise<OfferTemplate[]> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('offer_templates')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map(template => ({
                id: template.id,
                userId: template.user_id,
                name: template.name,
                subject: template.subject,
                content: template.content,
                createdAt: template.created_at,
                updatedAt: template.updated_at
            }));
        },
        createTemplate: async (templateData: {
            name: string;
            subject: string;
            content: string;
        }): Promise<OfferTemplate> => {
            const userId = await getUserId();
            if (!userId) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('offer_templates')
                .insert({
                    user_id: userId,
                    name: templateData.name,
                    subject: templateData.subject,
                    content: templateData.content
                })
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                userId: data.user_id,
                name: data.name,
                subject: data.subject,
                content: data.content,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        getByToken: async (token: string): Promise<Offer | null> => {
            // No auth required - this is for candidates to view their offer
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('offer_token', token)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Not found
                }
                throw error;
            }

            // Check if token is expired
            if (data.offer_token_expires_at && new Date(data.offer_token_expires_at) < new Date()) {
                throw new Error('This offer link has expired. Please contact the recruiter.');
            }

            return {
                id: data.id,
                candidateId: data.candidate_id,
                jobId: data.job_id,
                userId: data.user_id,
                positionTitle: data.position_title,
                startDate: data.start_date || undefined,
                salaryAmount: data.salary_amount ? parseFloat(data.salary_amount) : undefined,
                salaryCurrency: data.salary_currency || 'USD',
                salaryPeriod: data.salary_period || 'yearly',
                benefits: data.benefits || undefined,
                notes: data.notes || undefined,
                status: data.status as Offer['status'],
                sentAt: data.sent_at || undefined,
                viewedAt: data.viewed_at || undefined,
                respondedAt: data.responded_at || undefined,
                expiresAt: data.expires_at || undefined,
                response: data.response || undefined,
                negotiationHistory: data.negotiation_history || undefined,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        },
        acceptByToken: async (token: string, response?: string): Promise<Offer> => {
            // Use atomic RPC function to prevent race conditions
            const { data: result, error: rpcError } = await supabase
                .rpc('accept_offer_atomic', {
                    offer_token_param: token,
                    response_text: response || null
                });

            if (rpcError) {
                throw new Error(`Failed to accept offer: ${rpcError.message}`);
            }

            if (!result || !result.success) {
                throw new Error(result?.error || 'Failed to accept offer');
            }

            // Fetch the updated offer
            const { data: updated, error: fetchError } = await supabase
                .from('offers')
                .select('*')
                .eq('id', result.offer_id)
                .single();

            if (fetchError || !updated) {
                throw new Error('Failed to fetch updated offer');
            }

            // Get candidate name for notification
            let candidateName = 'Candidate';
            if (updated.candidate_id) {
                try {
                    const { data: candidateData } = await supabase
                        .from('candidates')
                        .select('name')
                        .eq('id', updated.candidate_id)
                        .single();
                    if (candidateData) {
                        candidateName = candidateData.name;
                    }
                } catch (err) {
                    console.error('Error fetching candidate for notification:', err);
                }
            }

            // Create notification for the recruiter
            try {
                const { createNotification } = await import('./notificationHelpers');
                await createNotification(
                    updated.user_id,
                    'offer_accepted',
                    'Offer Accepted',
                    `${candidateName} has accepted the offer for ${updated.position_title}.${response ? ` Response: ${response}` : ''}`
                );
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
                // Don't fail the offer acceptance if notification fails
            }

            // Candidate stage is already updated atomically by the RPC function
            // Execute workflows for Hired stage if candidate was moved
            if (updated.candidate_id && result.candidate_id) {
                try {
                    const { executeWorkflowsForStage } = await import('./workflowEngine');
                    await executeWorkflowsForStage(updated.candidate_id, 'Hired', updated.user_id, false);
                } catch (workflowError) {
                    console.error('Error executing workflows for Hired stage:', workflowError);
                    // Don't fail the offer acceptance if workflow execution fails
                }
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        declineByToken: async (token: string, response?: string): Promise<Offer> => {
            // Use atomic RPC function to prevent race conditions
            const { data: result, error: rpcError } = await supabase
                .rpc('decline_offer_atomic', {
                    offer_token_param: token,
                    response_text: response || null
                });

            if (rpcError) {
                throw new Error(`Failed to decline offer: ${rpcError.message}`);
            }

            if (!result || !result.success) {
                throw new Error(result?.error || 'Failed to decline offer');
            }

            // Fetch the updated offer
            const { data: updated, error: fetchError } = await supabase
                .from('offers')
                .select('*')
                .eq('id', result.offer_id)
                .single();

            if (fetchError || !updated) {
                throw new Error('Failed to fetch updated offer');
            }

            // Get candidate name for notification
            let candidateName = 'Candidate';
            if (updated.candidate_id) {
                try {
                    const { data: candidateData } = await supabase
                        .from('candidates')
                        .select('name')
                        .eq('id', updated.candidate_id)
                        .single();
                    if (candidateData) {
                        candidateName = candidateData.name;
                    }
                } catch (err) {
                    console.error('Error fetching candidate for notification:', err);
                }
            }

            // Create notification for the recruiter
            try {
                const { createNotification } = await import('./notificationHelpers');
                await createNotification(
                    updated.user_id,
                    'offer_declined',
                    'Offer Declined',
                    `${candidateName} has declined the offer for ${updated.position_title}.${response ? ` Response: ${response}` : ''}`
                );
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
                // Don't fail the offer decline if notification fails
            }

            // Candidate stage is already updated atomically by the RPC function
            // No additional action needed

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        },
        counterOfferByToken: async (token: string, counterOffer: {
            salaryAmount?: number;
            salaryCurrency?: string;
            salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
            startDate?: string;
            benefits?: string[];
            notes?: string;
        }): Promise<Offer> => {
            // No auth required - this is for candidates to submit counter offers
            const { data: offerData, error: fetchError } = await supabase
                .from('offers')
                .select('*')
                .eq('offer_token', token)
                .single();

            if (fetchError) {
                throw new Error('Invalid or expired offer link');
            }

            // Check if token is expired
            if (offerData.offer_token_expires_at && new Date(offerData.offer_token_expires_at) < new Date()) {
                throw new Error('This offer link has expired. Please contact the recruiter.');
            }

            // Check if already responded
            if (offerData.status === 'accepted' || offerData.status === 'declined') {
                throw new Error(`This offer has already been ${offerData.status}.`);
            }

            // Get existing negotiation history
            const history = offerData.negotiation_history || [];
            
            // Add counter offer to negotiation history
            history.push({
                timestamp: new Date().toISOString(),
                type: 'counter_offer',
                counterOffer: {
                    salaryAmount: counterOffer.salaryAmount,
                    salaryCurrency: counterOffer.salaryCurrency || offerData.salary_currency,
                    salaryPeriod: counterOffer.salaryPeriod || offerData.salary_period,
                    startDate: counterOffer.startDate,
                    benefits: counterOffer.benefits,
                    notes: counterOffer.notes
                }
            });

            // Update offer status to negotiating and store counter offer
            const { data: updated, error } = await supabase
                .from('offers')
                .update({
                    status: 'negotiating',
                    negotiation_history: history,
                    response: counterOffer.notes || null
                })
                .eq('offer_token', token)
                .select()
                .single();

            if (error) throw error;

            // Get candidate name for notification
            let candidateName = 'Candidate';
            if (updated.candidate_id) {
                try {
                    const { data: candidateData } = await supabase
                        .from('candidates')
                        .select('name')
                        .eq('id', updated.candidate_id)
                        .single();
                    if (candidateData) {
                        candidateName = candidateData.name;
                    }
                } catch (err) {
                    console.error('Error fetching candidate for notification:', err);
                }
            }

            // Format counter offer details for notification
            const counterOfferDetails: string[] = [];
            if (counterOffer.salaryAmount) {
                const currency = counterOffer.salaryCurrency === 'USD' ? '$' : counterOffer.salaryCurrency || 'USD';
                const period = counterOffer.salaryPeriod === 'yearly' ? 'per year' : counterOffer.salaryPeriod === 'monthly' ? 'per month' : 'per hour';
                counterOfferDetails.push(`Salary: ${currency}${counterOffer.salaryAmount.toLocaleString()} ${period}`);
            }
            if (counterOffer.startDate) {
                counterOfferDetails.push(`Start Date: ${new Date(counterOffer.startDate).toLocaleDateString()}`);
            }
            if (counterOffer.benefits && counterOffer.benefits.length > 0) {
                counterOfferDetails.push(`Benefits: ${counterOffer.benefits.join(', ')}`);
            }

            // Create notification for the recruiter
            try {
                const { createNotification } = await import('./notificationHelpers');
                await createNotification(
                    updated.user_id,
                    'counter_offer_received',
                    'Counter Offer Received',
                    `${candidateName} has submitted a counter offer for ${updated.position_title}.${counterOfferDetails.length > 0 ? ` ${counterOfferDetails.join(' | ')}` : ''}${counterOffer.notes ? ` Notes: ${counterOffer.notes}` : ''}`
                );
            } catch (notifError) {
                console.error('Error creating notification:', notifError);
                // Don't fail the counter offer if notification fails
            }

            return {
                id: updated.id,
                candidateId: updated.candidate_id,
                jobId: updated.job_id,
                userId: updated.user_id,
                positionTitle: updated.position_title,
                startDate: updated.start_date || undefined,
                salaryAmount: updated.salary_amount ? parseFloat(updated.salary_amount) : undefined,
                salaryCurrency: updated.salary_currency || 'USD',
                salaryPeriod: updated.salary_period || 'yearly',
                benefits: updated.benefits || undefined,
                notes: updated.notes || undefined,
                status: updated.status as Offer['status'],
                sentAt: updated.sent_at || undefined,
                viewedAt: updated.viewed_at || undefined,
                respondedAt: updated.responded_at || undefined,
                expiresAt: updated.expires_at || undefined,
                response: updated.response || undefined,
                negotiationHistory: updated.negotiation_history || undefined,
                createdAt: updated.created_at,
                updatedAt: updated.updated_at
            };
        }
    }
};

