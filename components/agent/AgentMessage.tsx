'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Info,
  TrendingUp,
  TrendingDown,
  Ban,
  BrainCircuit,
  Search,
  HelpCircle,
  Cloud,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AgentMessage as AgentMessageType, AGENT_CHARACTERS } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

interface AgentMessageProps {
  message: AgentMessageType;
  onAction?: (actionId: string, intent: string, payload?: unknown) => void;
}

export function AgentMessage({ message, onAction }: AgentMessageProps) {
  const character = AGENT_CHARACTERS[message.agentType] ?? AGENT_CHARACTERS.neutral;
  const severityStyles = {
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    danger: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  };

  // Render Thinking Process
  const renderThinking = () => {
    if (!message.thoughtProcess || message.thoughtProcess.length === 0) return null;
    
    return (
      <div className="space-y-2 mb-3 px-1">
        {message.thoughtProcess.map((thought, i) => {
          let Icon = BrainCircuit;
          if (thought.toLowerCase().includes('weather') || thought.toLowerCase().includes('environment')) Icon = Cloud;
          else if (thought.toLowerCase().includes('search')) Icon = Search;
          else if (thought.toLowerCase().includes('ask')) Icon = HelpCircle;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.3 }} // Staggered appearance for effect
              className="flex items-center gap-2 text-xs text-muted-foreground italic"
            >
              <Icon className="w-3 h-3 shrink-0 animate-pulse" />
              <span>{thought}</span>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render Question Options (MCQ)
  const renderOptions = () => {
    if (message.type !== 'question' || !message.options) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {message.options.map((option, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            onClick={() => onAction?.(message.id, 'answer_question', { answer: option })}
            className="bg-background hover:bg-secondary"
          >
            {option}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="space-y-3"
    >
      {/* Thinking Process (Visualized before the bubble) */}
      {renderThinking()}

      {/* Message Bubble */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div 
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-lg",
            character.bg
          )}
        >
          {character.avatar}
        </div>

        {/* Message Content */}
        <div className="flex-1 space-y-2">
          {/* Main Message */}
          <div 
            className={cn(
              'rounded-2xl rounded-tl-sm p-4 border',
              message.meta?.severity 
                ? severityStyles[message.meta.severity]
                : 'bg-muted/50 border-border'
            )}
          >
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
            
            {/* Render Options if it's a question */}
            {renderOptions()}
            
            {/* Confidence Badge */}
            {message.meta?.confidence && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {Math.round(message.meta.confidence * 100)}% confident
                </Badge>
              </div>
            )}
          </div>

          {/* Highlights */}
          {message.highlights && message.highlights.length > 0 && (
            <div className="space-y-1 px-2">
              {message.highlights.map((highlight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                  <span>{highlight}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Routine Diff */}
          {message.routineDiff && (
            <Card className="border-dashed">
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Routine Changes</p>
                
                {message.routineDiff.blocked.length > 0 && (
                  <div className="space-y-1">
                    {message.routineDiff.blocked.map((rec) => (
                      <div key={rec.id} className="flex items-center gap-2 text-xs">
                        <Ban className="w-3 h-3 text-red-500" />
                        <span className="line-through text-muted-foreground">{rec.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {message.routineDiff.added.length > 0 && (
                  <div className="space-y-1">
                    {message.routineDiff.added.map((rec) => (
                      <div key={rec.id} className="flex items-center gap-2 text-xs">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-green-700 dark:text-green-300">{rec.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => onAction?.(action.id, action.intent, action.payload)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
