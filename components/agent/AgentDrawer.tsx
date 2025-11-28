'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useAgent } from '@/lib/contexts';
import { AGENT_CHARACTERS } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

interface AgentDrawerProps {
  onAction?: (actionId: string, intent: string, payload?: unknown) => void;
}

export function AgentDrawer({ onAction }: AgentDrawerProps) {
  const { isOpen, closeDrawer, messages, isTyping, markAllRead, clearMessages } = useAgentUI();
  const { activeAgent } = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    }
  }, [isOpen, markAllRead]);

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
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearMessages}
                className="text-muted-foreground hover:text-foreground"
                title="Clear messages"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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

        {/* Footer / Quick Actions Area (Future) */}
        <div 
          className="border-t px-4 py-3 shrink-0 bg-background"
        >
          <p className="text-[10px] text-center text-muted-foreground">
            AI-powered insights · Always here to help
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

