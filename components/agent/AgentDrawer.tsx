'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AgentAvatar } from './AgentAvatar';
import { AgentMessage } from './AgentMessage';
import { useAgentUI } from '@/lib/contexts';
import { useAgent, useUser } from '@/lib/contexts';
import { AGENT_CHARACTERS } from '@/lib/types/agent';
import { cn } from '@/lib/utils';
import { saveAgentMessage } from '@/lib/firebase/agent';

interface AgentDrawerProps {
  onAction?: (actionId: string, intent: string, payload?: unknown) => void;
}

export function AgentDrawer({ onAction }: AgentDrawerProps) {
  const { isOpen, closeDrawer, messages, isTyping, markAllRead, clearMessages, pushMessage, setTyping } = useAgentUI();
  const { activeAgent } = useAgent();
  const { user } = useUser();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const character = AGENT_CHARACTERS[activeAgent];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Mark as read when opened
  useEffect(() => {
    if (isOpen) {
      markAllRead();
      // Focus input when drawer opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, markAllRead]);

  // Handle keyboard input submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const message = inputValue.trim();
    if (!message || isSubmitting) return;

    setIsSubmitting(true);
    setInputValue('');
    setTyping(true);

    try {
      // Save user message first
      const userMessage: AgentMessage = {
        id: `user-${Date.now()}`,
        agentType: activeAgent,
        message,
        type: 'text',
        timestamp: new Date(),
        read: true,
      };

      pushMessage(userMessage, true);

      // Build conversation history from recent messages (including the new user message)
      const allMessages = [...messages, userMessage];
      const history = allMessages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.type === 'question' ? 'agent' : 'user' as 'agent' | 'user',
          content: msg.message,
        }));

      // Call Gemini API
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.message || 'I apologize, but I encountered an error processing your question.';

      // Save agent response
      const agentMessage: AgentMessage = {
        id: `agent-${Date.now()}`,
        agentType: activeAgent,
        message: responseText,
        type: 'text',
        timestamp: new Date(),
        read: false,
      };

      pushMessage(agentMessage, true);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: AgentMessage = {
        id: `error-${Date.now()}`,
        agentType: activeAgent,
        message: 'I apologize, but I encountered an error. Please try again.',
        type: 'text',
        timestamp: new Date(),
        read: false,
      };
      pushMessage(errorMessage, true);
    } finally {
      setIsSubmitting(false);
      setTyping(false);
      // Refocus input after response
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] rounded-t-3xl p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader 
          className="py-1 border-b shrink-0 ml-[-1.2rem]" 
          style={{ backgroundColor: `${character.color}10` }}
        >
          <div className="flex items-center justify-between h-16 w-full px-4"> 
            <div className="flex items-center gap-3"> 
              <AgentAvatar agentType={activeAgent} size="lg" animate={false} variant="plain" /> 
              <SheetTitle className="text-base ml-[-1.5rem]">DermAid Agent</SheetTitle> 
            </div>
          </div>
        </SheetHeader>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AgentAvatar agentType={activeAgent} size="xl" />
              <p className="text-sm text-muted-foreground mt-4 max-w-xs">
                {character.greeting}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                I'll send you updates about your skin health
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <AgentMessage key={msg.id} message={msg} onAction={onAction} />
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg overflow-hidden"
                    style={{ backgroundColor: character.color }}
                  >
                    <img src="/avatar.png" alt="Agent" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-muted-foreground/50"
                          animate={{
                            y: [0, -4, 0],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Footer / Input Area */}
        <div 
          className="border-t shrink-0 bg-background"
        >
          {/* Keyboard Input */}
          <form onSubmit={handleSubmit} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask me anything about your skin..."
                disabled={isSubmitting || isTyping}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isSubmitting || isTyping}
                className={cn(
                  "shrink-0",
                  activeAgent === 'cosmetic'
                    ? "bg-gradient-to-br from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600"
                    : "bg-gradient-to-br from-teal-300 to-cyan-400 hover:from-teal-400 hover:to-cyan-500"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Quick Actions */}
          {messages.length > 0 && (
            <div className="px-4 pb-2 flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearMessages}
                className="text-muted-foreground hover:text-foreground"
                title="Clear messages"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

