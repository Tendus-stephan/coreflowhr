/**
 * Credits System Service
 * Manages user credits for purchasing additional usage beyond plan limits
 */

import { supabase } from './supabase';

export type CreditType = 'candidates' | 'jobs' | 'ai_analysis';

export interface UserCredits {
  id: string;
  userId: string;
  creditType: CreditType;
  amount: number;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * Get available credits for a user by type
 */
export async function getAvailableCredits(userId: string, creditType: CreditType): Promise<number> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('user_credits')
    .select('amount')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching credits:', error);
    return 0;
  }

  // Sum all valid credits
  return (data || []).reduce((sum, credit) => sum + (credit.amount || 0), 0);
}

/**
 * Purchase credits (creates credit record - actual payment handled via Stripe)
 */
export async function purchaseCredits(
  userId: string,
  creditType: CreditType,
  amount: number,
  expiresAt?: Date
): Promise<UserCredits> {
  const { data, error } = await supabase
    .from('user_credits')
    .insert({
      user_id: userId,
      credit_type: creditType,
      amount: amount,
      expires_at: expiresAt?.toISOString() || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    creditType: data.credit_type as CreditType,
    amount: data.amount,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}

/**
 * Use credits (deducts from available credits)
 */
export async function useCredits(
  userId: string,
  creditType: CreditType,
  amount: number
): Promise<boolean> {
  const now = new Date().toISOString();
  
  // Get available credits, ordered by expiry (use non-expiring first, then earliest expiry)
  const { data: credits, error: fetchError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('expires_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching credits for use:', fetchError);
    return false;
  }

  if (!credits || credits.length === 0) {
    return false;
  }

  let remainingToDeduct = amount;
  
  // Deduct credits, starting with non-expiring ones, then earliest expiry
  for (const credit of credits) {
    if (remainingToDeduct <= 0) break;

    const availableInThisCredit = credit.amount || 0;
    
    if (availableInThisCredit >= remainingToDeduct) {
      // This credit has enough, deduct and update
      const newAmount = availableInThisCredit - remainingToDeduct;
      
      if (newAmount > 0) {
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ amount: newAmount })
          .eq('id', credit.id);
          
        if (updateError) {
          console.error('Error updating credit:', updateError);
          return false;
        }
      } else {
        // Credit exhausted, delete it
        const { error: deleteError } = await supabase
          .from('user_credits')
          .delete()
          .eq('id', credit.id);
          
        if (deleteError) {
          console.error('Error deleting exhausted credit:', deleteError);
          return false;
        }
      }
      
      remainingToDeduct = 0;
    } else {
      // This credit doesn't have enough, use all of it and continue
      remainingToDeduct -= availableInThisCredit;
      
      const { error: deleteError } = await supabase
        .from('user_credits')
        .delete()
        .eq('id', credit.id);
        
      if (deleteError) {
        console.error('Error deleting credit:', deleteError);
        return false;
      }
    }
  }

  // If we couldn't deduct all requested, return false
  if (remainingToDeduct > 0) {
    console.warn(`Insufficient credits: needed ${amount}, could only deduct ${amount - remainingToDeduct}`);
    return false;
  }

  return true;
}

/**
 * Get effective limit (plan base limit + available credits)
 */
export async function getEffectiveLimit(
  userId: string,
  planName: string | null | undefined,
  creditType: CreditType
): Promise<number> {
  const { getPlanLimits } = await import('./planLimits');
  const limits = getPlanLimits(planName);
  
  let baseLimit = 0;
  
  switch (creditType) {
    case 'candidates':
      baseLimit = typeof limits.maxCandidatesPerMonth === 'number' 
        ? limits.maxCandidatesPerMonth 
        : 0;
      break;
    case 'jobs':
      baseLimit = typeof limits.maxActiveJobs === 'number' 
        ? limits.maxActiveJobs 
        : 0;
      break;
    case 'ai_analysis':
      baseLimit = limits.maxAiAnalysisPerMonth;
      break;
  }
  
  const credits = await getAvailableCredits(userId, creditType);
  
  return baseLimit + credits;
}

/**
 * Get all credits for a user (for display in settings)
 */
export async function getAllUserCredits(userId: string): Promise<UserCredits[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('credit_type', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all credits:', error);
    return [];
  }

  return (data || []).map(credit => ({
    id: credit.id,
    userId: credit.user_id,
    creditType: credit.credit_type as CreditType,
    amount: credit.amount,
    expiresAt: credit.expires_at,
    createdAt: credit.created_at,
  }));
}
