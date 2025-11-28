'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AgentDrawer } from './AgentDrawer';
import { WeatherListener } from './WeatherListener';
import { useAgentUI } from '@/lib/contexts';

export function AgentUI() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeDrawer } = useAgentUI();

  // Hide on onboarding
  const shouldHide = pathname?.startsWith('/onboarding');

  const handleAction = (actionId: string, intent: string, payload?: unknown) => {
    switch (intent) {
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

