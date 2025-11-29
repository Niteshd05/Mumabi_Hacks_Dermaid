import { getUserProfile, getUserScans } from '@/lib/firebase/firestore';
import { getRecentAgentMessages } from '@/lib/firebase/agent';
import type { UserProfile } from '@/lib/types';

export interface UserContextData {
  profile: UserProfile | null;
  recentMessages: any[];
  scans: any[];
}

export async function getUserContext(userId: string): Promise<UserContextData> {
  const [profile, recentMessages, scans] = await Promise.all([
    getUserProfile(userId),
    getRecentAgentMessages(userId, 20),
    getUserScans(userId),
  ]);
  return { profile, recentMessages, scans };
}


