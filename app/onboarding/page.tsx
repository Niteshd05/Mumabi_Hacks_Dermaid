'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, User, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MobileContainer, TopBar } from '@/components/layout';
import { SkinToneSelector } from '@/components/features/onboarding/SkinToneSelector';
import { SkinTypeSelector } from '@/components/features/onboarding/SkinTypeSelector';
import { ConcernSelector } from '@/components/features/onboarding/ConcernSelector';
import { useUser, useAuth, useAgentUI } from '@/lib/contexts';
import { SkinType, FitzpatrickScale, SkinConcern } from '@/lib/types';
import { AgentAdapter } from '@/lib/logic/agentAdapter';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type Step = 'welcome' | 'basic' | 'skin-tone' | 'skin-type' | 'concerns' | 'complete';

export default function OnboardingPage() {
  const router = useRouter();
  const { setUser, completeOnboarding, user } = useUser();
  const { user: authUser, loading: authLoading, signIn } = useAuth();
  const { pushMessage, setTyping, openDrawer } = useAgentUI();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'prefer-not-to-say' as 'male' | 'female' | 'other' | 'prefer-not-to-say',
    fitzpatrickScale: null as FitzpatrickScale | null,
    skinType: null as SkinType | null,
    concerns: [] as SkinConcern[],
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (!authLoading && authUser && user?.onboardingComplete) {
      router.push('/dashboard');
    }
  }, [authLoading, authUser, user, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <>
        <TopBar />
        <MobileContainer className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-orange-500" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </MobileContainer>
      </>
    );
  }

  // Show login screen if not authenticated
  if (!authUser && currentStep === 'welcome') {
    return (
      <>
        <TopBar />
        <MobileContainer className="flex items-center justify-center min-h-screen pb-8 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center mb-4"
            >
              <img src="/logo.png" alt="DermAid Logo" className="w-14 h-14 object-contain dark:invert" />
            </motion.div>
            <h1 className="text-3xl font-bold">Welcome to DermAid</h1>
            <p className="text-muted-foreground">
              Sign in with Google to get started with your personalized skin health journey.
            </p>
            <Button
              onClick={async () => {
                try {
                  await signIn();
                  setCurrentStep('basic');
                } catch (error) {
                  console.error('Sign in failed:', error);
                }
              }}
              size="lg"
              className="bg-gradient-to-r from-orange-400 to-amber-500 text-white w-full"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </motion.div>
        </MobileContainer>
      </>
    );
  }

  const steps: Step[] = ['welcome', 'basic', 'skin-tone', 'skin-type', 'concerns', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.fitzpatrickScale || !formData.skinType || formData.concerns.length === 0) {
      return;
    }

    if (!authUser?.uid) {
      // Should not happen, but handle gracefully
      return;
    }

    setIsSubmitting(true);

    try {
      // Create user profile
      const userProfile = {
        id: authUser.uid,
        name: formData.name || authUser.displayName || 'User',
        age: parseInt(formData.age) || 25,
        gender: formData.gender,
        skinType: formData.skinType,
        fitzpatrickScale: formData.fitzpatrickScale,
        concerns: formData.concerns,
        onboardingComplete: true,
        createdAt: new Date(),
      };

      await setUser(userProfile);
      await completeOnboarding();
      
      router.push('/dashboard');

      // Trigger welcome agent message
      setTimeout(() => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const welcomeMessage = AgentAdapter.fromOnboardingComplete(userProfile);
          pushMessage(welcomeMessage);
          openDrawer();
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return formData.name.trim().length > 0 && formData.age.trim().length > 0;
      case 'skin-tone':
        return formData.fitzpatrickScale !== null;
      case 'skin-type':
        return formData.skinType !== null;
      case 'concerns':
        return formData.concerns.length > 0;
      default:
        return true;
    }
  };

  return (
    <>
      <TopBar />
      <MobileContainer className="pb-8 pt-4">
        {/* Progress Bar */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Step {currentStepIndex} of {steps.length - 2}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round((currentStepIndex / (steps.length - 2)) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStepIndex / (steps.length - 2)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-4"
              >
                <Sparkles className="w-12 h-12 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold">Welcome to DermAid</h1>
              <p className="text-muted-foreground max-w-sm">
                Let's create your personalized skin health profile. This will only take a few minutes.
              </p>
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-gradient-to-r from-orange-400 to-amber-500 text-white mt-4"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Basic Info Step */}
          {currentStep === 'basic' && (
            <motion.div
              key="basic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Tell Us About Yourself</h2>
                <p className="text-muted-foreground">
                  We'll use this to personalize your experience.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Name
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Age
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter your age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="h-12"
                    min="1"
                    max="120"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Skin Tone Step */}
          {currentStep === 'skin-tone' && (
            <motion.div
              key="skin-tone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SkinToneSelector
                selected={formData.fitzpatrickScale}
                onSelect={(scale) => setFormData({ ...formData, fitzpatrickScale: scale })}
              />
            </motion.div>
          )}

          {/* Skin Type Step */}
          {currentStep === 'skin-type' && (
            <motion.div
              key="skin-type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SkinTypeSelector
                selected={formData.skinType}
                onSelect={(type) => setFormData({ ...formData, skinType: type })}
              />
            </motion.div>
          )}

          {/* Concerns Step */}
          {currentStep === 'concerns' && (
            <motion.div
              key="concerns"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ConcernSelector
                selected={formData.concerns}
                onToggle={(concern) => {
                  const concerns = formData.concerns.includes(concern)
                    ? formData.concerns.filter(c => c !== concern)
                    : [...formData.concerns, concern];
                  setFormData({ ...formData, concerns });
                }}
              />
            </motion.div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center"
              >
                <span className="text-4xl">✓</span>
              </motion.div>
              <h2 className="text-2xl font-bold">You're All Set!</h2>
              <p className="text-muted-foreground max-w-sm">
                Your profile is ready. Let's start taking care of your skin.
              </p>
              <Button
                onClick={handleSubmit}
                size="lg"
                className="bg-gradient-to-r from-orange-400 to-amber-500 text-white mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="bg-gradient-to-r from-orange-400 to-amber-500 text-white"
            >
              {currentStepIndex === steps.length - 2 ? 'Review' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </MobileContainer>
    </>
  );
}

