'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AgentMessage, AgentResponse } from '@/lib/types/agent';
import { useAuth } from './AuthContext';
import { saveAgentMessage, getRecentAgentMessages, clearAgentMessages } from '@/lib/firebase/agent';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface AgentUIContextType {
  isOpen: boolean;
  messages: AgentMessage[];
  unreadCount: number;
  isTyping: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  pushMessage: (response: AgentResponse, persist?: boolean) => void;
  markAllRead: () => void;
  clearMessages: () => Promise<void>;
  setTyping: (typing: boolean) => void;
}

const AgentUIContext = createContext<AgentUIContextType | undefined>(undefined);

export function AgentUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  // Queue messages that need persistence until auth is ready
  const [pendingPersist, setPendingPersist] = useState<AgentMessage[]>([]);
  const { user: authUser } = useAuth();

  // Subscribe to messages in real-time
  useEffect(() => {
    if (!authUser?.uid) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'users', authUser.uid, 'agent_messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        // Safe timestamp conversion
        let timestamp = new Date();
        if (data.timestamp instanceof Timestamp) timestamp = data.timestamp.toDate();
        else if (data.timestamp instanceof Date) timestamp = data.timestamp;
        else if (typeof data.timestamp === 'number') timestamp = new Date(data.timestamp);
        else if (typeof data.timestamp === 'string') timestamp = new Date(data.timestamp);

        return {
          id: doc.id,
          ...data,
          timestamp,
        } as AgentMessage;
      });

      // Sort oldest first for chat view (chronological order)
      const sortedMessages = msgs.sort((a, b) => {
        const timeA = a.timestamp.getTime();
        const timeB = b.timestamp.getTime();
        
        // If timestamps are equal, use sequence number if available
        if (timeA === timeB) {
          const seqA = (a as any)._sequence || 0;
          const seqB = (b as any)._sequence || 0;
          if (seqA !== seqB) {
            return seqA - seqB;
          }
          // Fall back to document ID for stable sort
          return a.id.localeCompare(b.id);
        }
        return timeA - timeB;
      });
      
      setMessages(sortedMessages);
    }, (error) => {
      console.error('Agent message subscription error:', error);
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  // Flush any pending messages once auth is available
  useEffect(() => {
    const flushPending = async () => {
      if (!authUser?.uid || pendingPersist.length === 0) return;
      try {
        for (const msg of pendingPersist) {
          const { timestamp, ...messageWithoutTimestamp } = msg as any;
          await saveAgentMessage(authUser.uid, messageWithoutTimestamp);
          console.log('Flushed pending agent message to Firestore:', msg.id);
        }
        setPendingPersist([]);
        // Real-time subscription will handle the update
      } catch (err) {
        console.error('Failed flushing pending agent messages:', err);
      }
    };
    flushPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, pendingPersist.length]);

  const unreadCount = messages.filter(m => !m.read).length;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    // Mark all as read when opening
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }, [isOpen, openDrawer, closeDrawer]);

  const pushMessage = useCallback(async (response: AgentResponse, persist: boolean = true) => {
    const now = Date.now();
    const message: AgentMessage = {
      ...response,
      // Preserve existing timestamp if present, otherwise use current time
      timestamp: (response as any).timestamp || new Date(now),
      read: isOpen, // Auto-read if drawer is already open
      // Add sequence number for proper ordering (use existing or create new)
      _sequence: (response as any)._sequence || now,
    } as any;
    
    // Add to local state immediately for instant UX
    // (Firestore subscription will sync it shortly after, but this prevents UI lag)
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      
      // Insert message and sort chronologically (oldest first)
      const newMessages = [...prev, message];
      return newMessages.sort((a, b) => {
        const timeA = a.timestamp.getTime();
        const timeB = b.timestamp.getTime();
        
        // If timestamps are equal, use sequence number if available
        if (timeA === timeB) {
          const seqA = (a as any)._sequence || 0;
          const seqB = (b as any)._sequence || 0;
          if (seqA !== seqB) {
            return seqA - seqB;
          }
          // Fall back to document ID for stable sort
          return a.id.localeCompare(b.id);
        }
        return timeA - timeB;
      });
    });

    // Persist to Firestore
    if (persist && authUser?.uid) {
      try {
        const { timestamp, ...messageWithoutTimestamp } = message;
        await saveAgentMessage(authUser.uid, messageWithoutTimestamp);
      } catch (error) {
        console.error('Failed to persist agent message:', error);
      }
    } else if (persist && !authUser?.uid) {
      setPendingPersist(prev => [...prev, message]);
    }
  }, [isOpen, authUser?.uid]);

  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  const clearMessages = useCallback(async () => {
    // Clear locally first for immediate UX
    setMessages([]);
    
    if (authUser?.uid) {
      try {
        await clearAgentMessages(authUser.uid);
        console.log('Cleared all agent messages');
      } catch (error) {
        console.error('Failed to clear agent messages:', error);
      }
    }
  }, [authUser?.uid]);

  return (
    <AgentUIContext.Provider
      value={{
        isOpen,
        messages,
        unreadCount,
        isTyping,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        pushMessage,
        markAllRead,
        clearMessages,
        setTyping: setIsTyping,
      }}
    >
      {children}
    </AgentUIContext.Provider>
  );
}

export function useAgentUI() {
  const context = useContext(AgentUIContext);
  if (context === undefined) {
    throw new Error('useAgentUI must be used within an AgentUIProvider');
  }
  return context;
}
