'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AgentDrawer } from './AgentDrawer';
import { WeatherListener } from './WeatherListener';
import { useAgentUI, useAgent, useUser, useWeather } from '@/lib/contexts';
import { saveAgentMessage } from '@/lib/firebase/agent';

export function AgentUI() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeDrawer, pushMessage, messages, setTyping } = useAgentUI();
  const { lastMedicalScan, lastCosmeticScan, activeAgent } = useAgent();
  const { user } = useUser();
  const { weather } = useWeather();

  // Hide on onboarding
  const shouldHide = pathname?.startsWith('/onboarding');

  const handleAction = async (actionId: string, intent: string, payload?: any) => {
    switch (intent) {
      case 'answer_question':
        if (activeAgent === 'medical' && lastMedicalScan && user) {
          const answerText = payload?.answer || 'Yes';
          setTyping(true);

          // Build conversation history: only include the last question and its answer
          const agentMessages = messages.filter(m => m.agentType === 'medical');
          const lastQuestion = agentMessages
            .slice()
            .reverse()
            .find(m => m.type === 'question');
          
          const history: Array<{ role: 'agent' | 'user'; content: string }> = [];
          
          if (lastQuestion) {
            history.push({ role: 'agent', content: lastQuestion.message });
            history.push({ role: 'user', content: answerText });
          } else {
            history.push({ role: 'user', content: answerText });
          }
          
          console.log('[AgentUI] Sending history to medical agent:', JSON.stringify(history, null, 2));

          try {
            const res = await fetch('/api/agents/medical', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                scan: lastMedicalScan,
                userProfile: user,
                weather,
                history,
              }),
            });

            setTyping(false);

            if (res.ok) {
              const out = await res.json();
              
              await saveAgentMessage(user.id, {
                agentType: 'medical',
                tone: 'clinical',
                message: out.message,
                type: out.type || 'text',
                options: out.options,
                thoughtProcess: out.thoughtProcess,
                meta: {
                  severity: out.urgency === 'critical' ? 'danger' : out.urgency === 'high' ? 'warning' : 'info',
                  timestamp: new Date(),
                  triggeredBy: 'scan',
                  riskLevel: out.riskLevel,
                  requiresDermatologist: out.requiresDermatologist,
                  urgency: out.urgency,
                  tips: out.tips,
                  products: out.products,
                },
              } as any);
            }
          } catch (err) {
            console.error('Error continuing medical agent conversation:', err);
            setTyping(false);
          }
        } else if (activeAgent === 'cosmetic' && lastCosmeticScan && user) {
          const answerText = payload?.answer || 'Yes';
          setTyping(true);

          // Build conversation history: only include the last question and its answer
          const agentMessages = messages.filter(m => m.agentType === 'cosmetic');
          const lastQuestion = agentMessages
            .slice()
            .reverse()
            .find(m => m.type === 'question');
          
          const history: Array<{ role: 'agent' | 'user'; content: string }> = [];
          
          if (lastQuestion) {
            history.push({ role: 'agent', content: lastQuestion.message });
            history.push({ role: 'user', content: answerText });
          } else {
            history.push({ role: 'user', content: answerText });
          }
          
          console.log('[AgentUI] Sending history to cosmetic agent:', JSON.stringify(history, null, 2));

          try {
            const res = await fetch('/api/agents/cosmetic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                scan: lastCosmeticScan,
                userProfile: user,
                weather,
                history,
              }),
            });

            setTyping(false);

            if (res.ok) {
              const out = await res.json();
              
              await saveAgentMessage(user.id, {
                agentType: 'cosmetic',
                tone: 'friendly',
                message: out.message,
                type: out.type || 'text',
                options: out.options,
                thoughtProcess: out.thoughtProcess,
                meta: {
                  severity: 'info',
                  timestamp: new Date(),
                  triggeredBy: 'scan',
                  routine: out.routine,
                  products: out.topProducts,
                  skinScore: out.skinScore,
                },
              } as any);

              // Save recommendation bundle if final
              if (out.type === 'final') {
                const { saveRecommendationLog } = await import('@/lib/firebase/firestore');
                await saveRecommendationLog(user.id, {
                  agentType: 'cosmetic',
                  recommendations: {
                    routine: out.routine,
                    products: out.topProducts,
                  },
                  scanResult: lastCosmeticScan,
                  notes: out.notes,
                  trace: out.trace,
                  skinScore: out.skinScore,
                } as any);
              }
            }
          } catch (err) {
            console.error('Error continuing cosmetic agent conversation:', err);
            setTyping(false);
          }
        }
        break;
      case 'apply_routine':
        closeDrawer();
        router.push('/dashboard');
        break;
      case 'start_scan':
        closeDrawer();
        router.push('/scan');
        break;
      case 'set_reminder':
        // Future: Implement reminder logic
        console.log('Set reminder:', payload);
        closeDrawer();
        break;
      case 'open_profile':
        closeDrawer();
        router.push('/profile');
        break;
      case 'view_education':
        // Future: Open education modal/page
        console.log('View education');
        break;
      case 'dismiss':
        closeDrawer();
        break;
      default:
        console.log('Unknown action:', intent);
    }
  };

  if (shouldHide) return null;

  return (
    <>
      <WeatherListener />
      <AgentDrawer onAction={handleAction} />
    </>
  );
}

