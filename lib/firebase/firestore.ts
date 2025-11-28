'use client';

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
  DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import { UserProfile } from '@/lib/types';

const USERS_COLLECTION = 'users';
const SCANS_COLLECTION = 'scans';

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as UserProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * Create or update user profile in Firestore
 */
export async function saveUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const existingDoc = await getDoc(userRef);

    if (existingDoc.exists()) {
      // Update existing profile
      await updateDoc(userRef, {
        ...profile,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new profile
      await setDoc(userRef, {
        ...profile,
        id: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

/**
 * Save scan result to Firestore
 */
export async function saveScanResult(
  userId: string,
  scanData: {
    agentType: 'cosmetic' | 'medical';
    result: any;
    imageUrl?: string;
    timestamp?: Date;
  }
): Promise<void> {
  try {
    const scansRef = collection(db, USERS_COLLECTION, userId, SCANS_COLLECTION);
    await setDoc(doc(scansRef), {
      ...scanData,
      timestamp: scanData.timestamp || new Date(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving scan result:', error);
    throw error;
  }
}

/**
 * Get user scan history
 */
export async function getUserScans(userId: string): Promise<any[]> {
  try {
    // This would require a query - for now, just return empty array
    // You can implement pagination and filtering later
    return [];
  } catch (error) {
    console.error('Error getting user scans:', error);
    throw error;
  }
}

