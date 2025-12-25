import { supabase } from './supabase';

/**
 * Check for expired jobs and create notifications
 * Should be called periodically (e.g., daily cron job or on page load)
 */
export const checkJobExpirations = async (): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const userId = user.id;

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

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);

        // Check each job for expiration (30 days after posting)
        for (const job of jobs) {
            // Skip jobs without a posted_date (they haven't been posted yet)
            if (!job.posted_date) continue;
            
            const postedDate = new Date(job.posted_date);
            
            // Validate the date is valid
            if (isNaN(postedDate.getTime())) continue;
            
            // Check if job has expired (30 days after posting)
            if (postedDate <= thirtyDaysAgo) {
                // Check if we already notified about this expiration
                const { data: existingNotif } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('type', 'job_expired')
                    .like('desc', `%${job.title}%`)
                    .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
                    .maybeSingle();

                // Only create notification if we haven't notified recently
                if (!existingNotif) {
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
                    
                    // Log activity
                    const { logJobExpired } = await import('./activityLogger');
                    await logJobExpired(job.title);
                }
            }
        }
    } catch (error) {
        console.error('Error checking job expirations:', error);
    }
};






