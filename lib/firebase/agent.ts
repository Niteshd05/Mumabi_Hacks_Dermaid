'use client';

import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { AgentMessage } from '@/lib/types/agent';

const AGENT_MESSAGES_COLLECTION = 'agent_messages';

/**
 * Save agent message to Firestore
 */
export async function saveAgentMessage(
  userId: string,
  message: Omit<AgentMessage, 'timestamp'>
): Promise<void> {
  try {
    const messagesRef = collection(db, 'users', userId, AGENT_MESSAGES_COLLECTION);
    await addDoc(messagesRef, {
      ...message,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving agent message:', error);
    throw error;
  }
}

/**
 * Get recent agent messages
 */
export async function getRecentAgentMessages(
  userId: string,
  limitCount: number = 20
): Promise<AgentMessage[]> {
  try {
    const messagesRef = collection(db, 'users', userId, AGENT_MESSAGES_COLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as AgentMessage;
    });
  } catch (error) {
    console.error('Error getting agent messages:', error);
    return [];
  }
}

