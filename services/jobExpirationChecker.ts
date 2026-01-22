import { supabase } from './supabase';

// Track last check time per user to prevent excessive checks
const lastCheckTime = new Map<string, number>();
const MIN_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour minimum between checks

/**
 * Check for expired jobs and create notifications
 * Should be called periodically (e.g., daily cron job or on page load)
 * Includes debouncing to prevent excessive checks
 */
export const checkJobExpirations = async (): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userId = user.id;
        
        // Debounce: Only check if at least 1 hour has passed since last check
        const now = Date.now();
        const lastCheck = lastCheckTime.get(userId) || 0;
        if (now - lastCheck < MIN_CHECK_INTERVAL) {
            console.log('[Job Expiration Check] Skipping - checked recently');
            return;
        }
        
        // Update last check time
        lastCheckTime.set(userId, now);

        // Get all active jobs
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('id, title, posted_date, status')
            .eq('user_id', userId)
            .eq('status', 'Active');

        if (error) {
            console.error('Error fetching jobs for expiration check:', error);
            return;
        }

        if (!jobs || jobs.length === 0) return;

        const currentDate = new Date();
        const thirtyDaysAgo = new Date(currentDate);
        thirtyDaysAgo.setDate(currentDate.getDate() - 30);

        // Check each job for expiration (30 days after posting)
        for (const job of jobs) {
            // Skip jobs without a posted_date (they haven't been posted yet)
            if (!job.posted_date) continue;
            
            const postedDate = new Date(job.posted_date);
            
            // Validate the date is valid
            if (isNaN(postedDate.getTime())) continue;
            
            // Check if job has expired (30 days after posting)
            if (postedDate <= thirtyDaysAgo) {
                // Check if we already notified about this specific job expiration
                // Use a more reliable check: look for ANY job_expired notification for this user
                // that mentions this job title, regardless of when it was created
                // This prevents duplicate notifications for the same expired job
                const { data: existingNotifs } = await supabase
                    .from('notifications')
                    .select('id, desc')
                    .eq('user_id', userId)
                    .eq('type', 'job_expired')
                    .like('desc', `%${job.title}%`)
                    .order('created_at', { ascending: false })
                    .limit(10);

                // Check if we already have a notification for this exact job
                const hasExistingNotif = existingNotifs && existingNotifs.some(notif => 
                    notif.desc && notif.desc.includes(`"${job.title}"`)
                );

                // Also check activity logs to prevent duplicate activity entries
                const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                const { data: existingActivity } = await supabase
                    .from('activity_log')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('action', 'job_expired')
                    .eq('target', job.title)
                    .gte('created_at', sevenDaysAgo.toISOString())
                    .limit(1)
                    .maybeSingle();

                // Only create notification and activity if we haven't already done so
                if (!hasExistingNotif && !existingActivity) {
                    // Create notification
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: userId,
                            title: 'Job Posting Expired',
                            desc: `Your job posting "${job.title}" has expired after 30 days. Consider closing or reposting it.`,
                            type: 'job_expired',
                            category: 'job',
                            unread: true
                        });
                    
                    // Log activity (only once per job)
                    const { logJobExpired } = await import('./activityLogger');
                    await logJobExpired(job.title);
                }
            }
        }
    } catch (error) {
        console.error('Error checking job expirations:', error);
    }
};






