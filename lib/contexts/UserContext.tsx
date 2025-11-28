'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { UserProfile, SkinType, FitzpatrickScale, SkinConcern } from '@/lib/types';
import { useAuth } from './AuthContext';
import { saveUserProfile } from '@/lib/firebase/firestore';

interface UserContextType {
  user: UserProfile | null;
  isOnboarded: boolean;
  setUser: (user: UserProfile) => Promise<void>;
  updateSkinType: (skinType: SkinType) => Promise<void>;
  updateFitzpatrick: (scale: FitzpatrickScale) => Promise<void>;
  updateConcerns: (concerns: SkinConcern[]) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  // Demo/Mock functions
  loadMockUser: (preset: 'acne-dark' | 'eczema' | 'default') => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, userProfile, refreshUserProfile } = useAuth();
  
  // Use profile from AuthContext (which loads from Firestore)
  const user = userProfile;

  const setUser = useCallback(async (newUser: UserProfile) => {
    if (!authUser?.uid) {
      throw new Error('User must be authenticated to save profile');
    }
    
    await saveUserProfile(authUser.uid, newUser);
    await refreshUserProfile();
  }, [authUser?.uid, refreshUserProfile]);

  const updateSkinType = useCallback(async (skinType: SkinType) => {
    if (!authUser?.uid || !user) return;
    
    await saveUserProfile(authUser.uid, { ...user, skinType });
    await refreshUserProfile();
  }, [authUser?.uid, user, refreshUserProfile]);

  const updateFitzpatrick = useCallback(async (fitzpatrickScale: FitzpatrickScale) => {
    if (!authUser?.uid || !user) return;
    
    await saveUserProfile(authUser.uid, { ...user, fitzpatrickScale });
    await refreshUserProfile();
  }, [authUser?.uid, user, refreshUserProfile]);

  const updateConcerns = useCallback(async (concerns: SkinConcern[]) => {
    if (!authUser?.uid || !user) return;
    
    await saveUserProfile(authUser.uid, { ...user, concerns });
    await refreshUserProfile();
  }, [authUser?.uid, user, refreshUserProfile]);

  const completeOnboarding = useCallback(async () => {
    if (!authUser?.uid || !user) return;
    
    await saveUserProfile(authUser.uid, { ...user, onboardingComplete: true });
    await refreshUserProfile();
  }, [authUser?.uid, user, refreshUserProfile]);

  // Demo presets for hackathon demonstrations
  const loadMockUser = useCallback(async (preset: 'acne-dark' | 'eczema' | 'default') => {
    if (!authUser?.uid) {
      throw new Error('User must be authenticated to load mock user');
    }

    const baseUser: Partial<UserProfile> = {
      name: 'Demo User',
      age: 28,
      gender: 'prefer-not-to-say',
      skinType: 'combination',
      fitzpatrickScale: 4,
      concerns: ['acne', 'dark-spots'],
      onboardingComplete: true,
    };

    let userToSave: Partial<UserProfile>;

    switch (preset) {
      case 'acne-dark':
        userToSave = {
          ...baseUser,
          name: 'Sarah',
          fitzpatrickScale: 5,
          skinType: 'oily',
          concerns: ['acne', 'dark-spots'],
        };
        break;
      case 'eczema':
        userToSave = {
          ...baseUser,
          name: 'James',
          fitzpatrickScale: 3,
          skinType: 'sensitive',
          concerns: ['health-monitoring'],
        };
        break;
      default:
        userToSave = baseUser;
    }

    await saveUserProfile(authUser.uid, userToSave);
    await refreshUserProfile();
  }, [authUser?.uid, refreshUserProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        isOnboarded: user?.onboardingComplete ?? false,
        setUser,
        updateSkinType,
        updateFitzpatrick,
        updateConcerns,
        completeOnboarding,
        loadMockUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

