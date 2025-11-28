'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AgentMessage, AgentResponse } from '@/lib/types/agent';
import { useAuth } from './AuthContext';
import { saveAgentMessage, getRecentAgentMessages } from '@/lib/firebase/agent';

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
  clearMessages: () => void;
  setTyping: (typing: boolean) => void;
}

const AgentUIContext = createContext<AgentUIContextType | undefined>(undefined);

export function AgentUIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const { user: authUser } = useAuth();

  // Load messages from Firestore on mount
  useEffect(() => {
    if (authUser?.uid) {
      getRecentAgentMessages(authUser.uid)
        .then(msgs => setMessages(msgs.reverse()))
        .catch(err => console.error('Failed to load agent messages:', err));
    }
  }, [authUser?.uid]);

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
    const message: AgentMessage = {
      ...response,
      timestamp: new Date(),
      read: isOpen, // Auto-read if drawer is already open
    };
    
    setMessages(prev => [...prev, message]);

    // Optionally persist to Firestore
    if (persist && authUser?.uid) {
      try {
        await saveAgentMessage(authUser.uid, message);
      } catch (error) {
        console.error('Failed to persist agent message:', error);
      }
    }
  }, [isOpen, authUser?.uid]);

  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const setTypingState = useCallback((typing: boolean) => {
    setIsTyping(typing);
  }, []);

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
        setTyping: setTypingState,
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

