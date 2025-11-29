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
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { AgentMessage } from '@/lib/types/agent';

const AGENT_MESSAGES_COLLECTION = 'agent_messages';

// Recursively remove undefined values (Firestore does not allow undefined)
function deepClean<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(v => deepClean(v)).filter(v => v !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    // Keep Date objects as-is
    if (value instanceof Date) return value;
    const cleaned: any = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v === undefined) return;
      cleaned[k] = deepClean(v as any);
    });
    return cleaned;
  }
  return value;
}

/**
 * Save agent message to Firestore
 * Uses client timestamp with sequence number to ensure proper ordering
 */
export async function saveAgentMessage(
  userId: string,
  message: Omit<AgentMessage, 'timestamp'>
): Promise<void> {
  try {
    const messagesRef = collection(db, 'users', userId, AGENT_MESSAGES_COLLECTION);
    
    // Use client timestamp to ensure proper ordering
    // Add a small random component to ensure uniqueness even if created in same millisecond
    const now = Date.now();
    const timestamp = new Date(now);
    // Add small random component (0-999) to ensure uniqueness
    const sequence = now * 1000 + Math.floor(Math.random() * 1000);
    
    // Clean undefined fields before saving
    const payload = deepClean({
      ...message,
      timestamp,
      // Add sequence number for tie-breaking (timestamp + random component)
      _sequence: sequence,
    });
    const docRef = await addDoc(messagesRef, payload);
    console.log('Agent message saved to Firestore with ID:', docRef.id, 'timestamp:', timestamp.toISOString());
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
    const toDateSafe = (value: any): Date => {
      if (!value) return new Date();
      if (value instanceof Date) return value;
      if (value instanceof Timestamp) return value.toDate();
      if (typeof value?.toDate === 'function') return value.toDate();
      if (typeof value === 'number') return new Date(value);
      if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date() : d;
      }
      return new Date();
    };

    const messagesRef = collection(db, 'users', userId, AGENT_MESSAGES_COLLECTION);
    // Order by timestamp first, then by sequence number for tie-breaking
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: toDateSafe(data.timestamp),
      } as AgentMessage;
    });
  } catch (error) {
    console.error('Error getting agent messages:', error);
    return [];
  }
}

/**
 * Clear all agent messages for a user
 */
export async function clearAgentMessages(userId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'users', userId, AGENT_MESSAGES_COLLECTION);
    const snapshot = await getDocs(messagesRef);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  } catch (error) {
    console.error('Error clearing agent messages:', error);
    throw error;
  }
}

