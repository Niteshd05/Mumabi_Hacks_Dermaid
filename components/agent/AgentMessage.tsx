'use client';

import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Info,
  TrendingUp,
  TrendingDown,
  Ban,
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
  const character = AGENT_CHARACTERS[message.agentType];
  const severityStyles = {
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    warning: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    danger: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="space-y-3"
    >
      {/* Message Bubble */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
          style={{ backgroundColor: character.color }}
        >
          <img src="/avatar.png" alt="Agent" className="w-12 h-12 object-contain" />
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
            <p className="text-sm leading-relaxed">{message.message}</p>
            
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
                  <Sparkles className="w-3 h-3 shrink-0 mt-0.5" style={{ color: character.accentColor }} />
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
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="font-medium">{rec.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alerts */}
          {message.alerts && message.alerts.length > 0 && (
            <div className="space-y-2">
              {message.alerts.map((alert) => (
                <Card 
                  key={alert.id}
                  className={cn(
                    'border',
                    alert.severity === 'danger' && 'border-red-300 bg-red-50 dark:bg-red-950/30',
                    alert.severity === 'warning' && 'border-amber-300 bg-amber-50 dark:bg-amber-950/30',
                    alert.severity === 'info' && 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn(
                        'w-4 h-4 shrink-0 mt-0.5',
                        alert.severity === 'danger' && 'text-red-500',
                        alert.severity === 'warning' && 'text-amber-500',
                        alert.severity === 'info' && 'text-blue-500'
                      )} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{alert.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{alert.actionRequired}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Actions */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.actions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={() => onAction?.(action.id, action.intent, action.payload)}
                  className={cn(
                    'text-xs',
                    action.variant === 'default' && 'bg-gradient-to-r text-white',
                    message.agentType === 'cosmetic' && action.variant === 'default' && 'from-orange-400 to-amber-500',
                    message.agentType === 'medical' && action.variant === 'default' && 'from-teal-400 to-cyan-400'
                  )}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-[10px] text-muted-foreground text-right">
        {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
    </motion.div>
  );
}

