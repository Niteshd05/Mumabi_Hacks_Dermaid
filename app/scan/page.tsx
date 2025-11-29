'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, ScanFace, Target, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileContainer, TopBar, BottomNav } from '@/components/layout';
import { DevTools } from '@/components/dev';
import { useAgent, useUser, useAuth, useAgentUI, useWeather } from '@/lib/contexts';
import { saveScanResult } from '@/lib/firebase/firestore';
import { AgentAdapter } from '@/lib/logic/agentAdapter';
import { CosmeticScanResult, MedicalScanResult, MedicalCondition, CosmeticCondition } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DermatologistReferralDialog } from '@/components/medical/DermatologistReferralDialog';

function mapApiLabelToCondition(raw: string): MedicalCondition {
  const s = (raw || '').toLowerCase().trim();
  
  // HIGH RISK CONDITIONS - Check these first
  if (s.includes('melanoma')) return 'melanoma';
  if (s.includes('skincancer') || s.includes('skin_cancer') || s.includes('skin cancer')) return 'skin_cancer';
  if (s.includes('bcc') || s.includes('basal cell')) return 'bcc';
  if (s.includes('scc') || s.includes('squamous cell')) return 'scc';
  if (s.includes('actinic') || s.includes('keratosis')) return 'actinic_keratosis';
  if (s.includes('lupus')) return 'lupus';
  if (s.includes('vasculitis')) return 'vasculitis';
  if (s.includes('bullous') || s.includes('pemphigus')) return 'bullous';
  if (s.includes('drugeruption') || s.includes('drug eruption') || s.includes('drug_eruption')) return 'drug_eruption';
  
  // MEDIUM RISK CONDITIONS
  if (s.includes('psoriasis')) return 'psoriasis';
  if (s.includes('vitiligo')) return 'vitiligo';
  if (s.includes('lichen')) return 'lichen';
  if (s.includes('mole') || s.includes('nevus') || s.includes('nevi')) return 'moles';
  if (s.includes('vascular') && s.includes('tumor')) return 'vascular_tumors';
  if (s.includes('sun') && (s.includes('damage') || s.includes('sunlight'))) return 'sun_damage';
  if (s.includes('benign') && s.includes('tumor')) return 'benign_tumors';
  
  // LOW RISK CONDITIONS
  if (s.includes('acne')) return 'acne';
  if (s.includes('rosacea')) return 'rosacea';
  if (s.includes('eczema') || s.includes('dermatitis') || s.includes('atopic')) return 'eczema';
  if (s.includes('tinea') || s.includes('ringworm')) return 'tinea';
  if (s.includes('candidiasis') || s.includes('yeast')) return 'candidiasis';
  if (s.includes('wart')) return 'warts';
  if (s.includes('seborrh') || s.includes('keratosis') && !s.includes('actinic')) return 'seborrheic_keratosis';
  if (s.includes('infestation') || s.includes('bite') || s.includes('scabies')) return 'infestations';
  if (s.includes('fung')) return 'fungal_infection';
  if (s.includes('hive') || s.includes('urticaria')) return 'hives';
  
  // Check for normal/healthy LAST
  if (s === 'unknown' || s === 'normal' || s === 'healthy' || 
      s === 'unknown_normal' || s.includes('unknown_normal')) {
    return 'normal';
  }
  
  // If we can't identify, default to normal (but log for debugging)
  console.warn('Unknown medical condition label:', raw);
  return 'normal';
}

function riskFromConfidence(conf?: number, label?: string, topK?: any[]): 'low' | 'medium' | 'high' {
  // NOTE: This confidence-based risk is for DISPLAY/UI purposes only
  // The actual routing (dermatologist vs. product recommendations) is based on condition classification
  
  if (typeof conf !== 'number') return 'low';
  
  const labelLower = (label || '').toLowerCase();
  const isNormal = labelLower.includes('unknown') || labelLower.includes('normal') || labelLower.includes('healthy');
  
  // If it's normal/unknown, always low risk
  if (isNormal) return 'low';
  
  // Check prediction uncertainty
  if (Array.isArray(topK) && topK.length > 1) {
    const topScore = topK[0]?.score ?? conf;
    const secondScore = topK[1]?.score ?? 0;
    const scoreDiff = topScore - secondScore;
    
    // If predictions are close, it's uncertain
    if (scoreDiff < 0.2 && conf < 0.9) {
      return 'low';
    }
  }
  
  // Confidence thresholds for UI display
  if (conf >= 0.85) return 'high';
  if (conf >= 0.65) return 'medium';
  return 'low';
}

function mapCosmeticApiResponse(data: any): CosmeticScanResult {
  // Actual API response structure:
  // - acne.detections: array of { class_id: "1"|"2"|"3"|"4", conf: number, box: [x1,y1,x2,y2] }
  // - dark_circles.detections: similar structure
  // - annotated_image: base64 string
  
  // Debug: Log the API response to understand structure
  console.log('Cosmetic API Response:', JSON.stringify(data, null, 2));
  
  const detectedConditions: CosmeticCondition[] = [];
  let maxSeverity = 0;
  let avgConfidence = 0;
  const confidences: number[] = [];

  // Extract acne detections
  const acneDetections = data?.acne?.detections ?? [];
  // Check for total count field (backend might filter detections but provide total count)
  const numAcne = data?.acne?.count ?? 
                  data?.acne?.total ?? 
                  data?.acne?.total_detections ??
                  data?.acne?.num_detections ??
                  acneDetections.length;
  
  // Extract grades from detections (class_id is the grade as string "1", "2", "3", "4")
  const acneGrades: number[] = [];
  const acneConfidences: number[] = [];
  
  acneDetections.forEach((detection: any) => {
    if (detection?.class_id) {
      const grade = parseInt(detection.class_id, 10);
      if (!isNaN(grade) && grade >= 1 && grade <= 4) {
        acneGrades.push(grade);
      }
    }
    if (detection?.conf !== undefined) {
      acneConfidences.push(detection.conf);
    }
  });
  
  // Get max grade or average grade
  const acneGrade = acneGrades.length > 0 ? Math.max(...acneGrades) : 0;
  const acneConfidence = acneConfidences.length > 0 
    ? acneConfidences.reduce((a, b) => a + b, 0) / acneConfidences.length 
    : 0.5;

  if (numAcne > 0) {
    detectedConditions.push('acne_vulgaris');
    if (acneGrade >= 3 || numAcne > 5) {
      detectedConditions.push('inflammatory_acne');
    }
    
    // Calculate grade-based severity (1-4 mapped to 0.25-1.0)
    const gradeSeverity = acneGrade > 0 ? Math.min(acneGrade / 4, 1) : 0;
    
    // Calculate count-based severity (more aggressive for high counts)
    let countSeverity = 0;
    if (numAcne >= 50) {
      countSeverity = 1.0;
    } else if (numAcne >= 20) {
      countSeverity = 0.9;
    } else if (numAcne >= 10) {
      countSeverity = 0.8;
    } else if (numAcne >= 6) {
      countSeverity = 0.7;
    } else if (numAcne >= 3) {
      countSeverity = 0.6;
    } else if (numAcne >= 1) {
      countSeverity = 0.4; // At least 0.4 for any acne detection
    }
    
    // Use the MAX of grade-based and count-based severity
    // This ensures high counts or high grades both result in high severity
    const acneSeverity = Math.max(gradeSeverity, countSeverity);
    maxSeverity = Math.max(maxSeverity, acneSeverity);
    confidences.push(acneConfidence);
  }

  // Extract dark circles detections
  const darkCirclesDetections = data?.dark_circles?.detections ?? [];
  // Check for total count field (backend might filter detections but provide total count)
  const numDarkCircles = data?.dark_circles?.count ??
                         data?.dark_circles?.total ??
                         data?.dark_circles?.total_detections ??
                         data?.dark_circles?.num_detections ??
                         darkCirclesDetections.length;
  
  const darkCirclesConfidences: number[] = [];
  darkCirclesDetections.forEach((detection: any) => {
    if (detection?.conf !== undefined) {
      darkCirclesConfidences.push(detection.conf);
    }
  });
  
  const darkCirclesConfidence = darkCirclesConfidences.length > 0
    ? darkCirclesConfidences.reduce((a, b) => a + b, 0) / darkCirclesConfidences.length
    : acneConfidence;

  if (numDarkCircles > 0) {
    detectedConditions.push('dark_circles');
    // Dark circles severity based on count (normalize to 0-1, assuming max 10 is severe)
    const circlesSeverity = Math.min(numDarkCircles / 10, 1);
    maxSeverity = Math.max(maxSeverity, circlesSeverity);
    confidences.push(darkCirclesConfidence);
  }

  // Calculate average confidence
  // For high detection counts, boost confidence (more detections = more reliable)
  if (confidences.length > 0) {
    const baseConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    // Boost confidence if we have many detections (more data = more reliable)
    const detectionCount = numAcne + numDarkCircles;
    const confidenceBoost = Math.min(detectionCount / 50, 0.3); // Up to 30% boost for 50+ detections
    avgConfidence = Math.min(baseConfidence + confidenceBoost, 1.0);
  } else {
    // Only use default confidence if we actually have detections
    // If no detections at all, confidence should be low
    if (numAcne > 0 || numDarkCircles > 0) {
      avgConfidence = data?.overall_confidence ?? data?.confidence ?? 0.5;
    } else {
      avgConfidence = 0.1; // Low confidence if nothing detected
    }
  }

  // Only add conditions if we actually detected something
  // Don't default to acne if nothing was detected
  if (detectedConditions.length === 0 && (numAcne > 0 || numDarkCircles > 0)) {
    // This should only happen if we have detections but conditions weren't added
    // This shouldn't happen with current logic, but keep as safety check
    if (numAcne > 0) {
      detectedConditions.push('acne_vulgaris');
    }
    if (numDarkCircles > 0) {
      detectedConditions.push('dark_circles');
    }
    maxSeverity = Math.max(0.4, maxSeverity);
  }

  // Ensure minimum severity if any conditions are detected
  if (detectedConditions.length > 0 && maxSeverity < 0.3) {
    maxSeverity = 0.4; // Force at least 0.4 if conditions detected
  }

  // If NO conditions detected (numAcne === 0 && numDarkCircles === 0), return empty conditions
  const finalConditions = (numAcne === 0 && numDarkCircles === 0) 
    ? [] 
    : (detectedConditions.length > 0 ? detectedConditions : []);

  // Build raw detections for downstream agentic reasoning (zone, severity by count)
  const rawAcne: any[] = Array.isArray(acneDetections)
    ? acneDetections.map((d: any) => ({
        classId: typeof d?.class_id === 'string' || typeof d?.class_id === 'number'
          ? parseInt(String(d.class_id), 10)
          : 0,
        confidence: typeof d?.conf === 'number' ? d.conf : 0,
        box: {
          x1: d?.box?.[0] ?? 0,
          y1: d?.box?.[1] ?? 0,
          x2: d?.box?.[2] ?? 0,
          y2: d?.box?.[3] ?? 0,
        },
        label: 'acne',
      }))
    : [];

  const rawDarkCircles: any[] = Array.isArray(darkCirclesDetections)
    ? darkCirclesDetections.map((d: any) => ({
        classId: typeof d?.class_id === 'string' || typeof d?.class_id === 'number'
          ? parseInt(String(d.class_id), 10)
          : 0,
        confidence: typeof d?.conf === 'number' ? d.conf : 0,
        box: {
          x1: d?.box?.[0] ?? 0,
          y1: d?.box?.[1] ?? 0,
          x2: d?.box?.[2] ?? 0,
          y2: d?.box?.[3] ?? 0,
        },
        label: 'dark_circles',
      }))
    : [];

  const result: CosmeticScanResult = {
    detected_conditions: finalConditions as CosmeticCondition[],
    severity_score: finalConditions.length > 0 
      ? Math.max(maxSeverity, 0.4) 
      : 0.1, // Low severity if no conditions
    confidence: Math.max(Math.min(avgConfidence, 1), 0), // Clamp between 0-1
    rawDetections: {
      acne: rawAcne,
      dark_circles: rawDarkCircles,
    },
    totalDetections: (numAcne || 0) + (numDarkCircles || 0),
  };
  
  // Debug: Log the mapped result
  console.log('Mapped CosmeticScanResult:', {
    numAcne,
    numDarkCircles,
    acneDetectionsLength: acneDetections.length,
    darkCirclesDetectionsLength: darkCirclesDetections.length,
    acneGrade,
    acneGrades: acneGrades.length > 0 ? acneGrades : 'none',
    acneConfidence,
    detectedConditions: result.detected_conditions,
    severity_score: result.severity_score,
    confidence: result.confidence,
    rawAcneData: {
      count: data?.acne?.count,
      total: data?.acne?.total,
      total_detections: data?.acne?.total_detections,
      num_detections: data?.acne?.num_detections,
    },
  });
  
  return result;
}

export default function ScanPage() {
  const { activeAgent, setLastCosmeticScan, setLastMedicalScan } = useAgent();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { weather } = useWeather();
  const { pushMessage, setTyping, openDrawer } = useAgentUI();
  const [showDermatologistDialog, setShowDermatologistDialog] = useState(false);
  const [dermatologistDialogData, setDermatologistDialogData] = useState<{
    urgency: 'critical' | 'high' | 'medium' | 'low';
    condition: string;
    message: string;
    tips: string[];
  } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [ageModelsLoaded, setAgeModelsLoaded] = useState(false);
  const faceapiRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Request camera access on mount
  useEffect(() => {
    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: activeAgent === 'cosmetic' ? 'user' : 'environment', // Front camera for face, back for body
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);
          };
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setCameraError(
          error instanceof Error && error.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera permissions.'
            : 'Failed to access camera. Please check your device settings.'
        );
      }
    };

    startCamera();

    // Cleanup: stop camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeAgent]);

  // Load face-api models for age estimation (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let mounted = true;
    (async () => {
      try {
        // Dynamically import face-api only on client side
        const faceapi = await import('@vladmandic/face-api');
        faceapiRef.current = faceapi;
        console.log('[face-api] Module loaded');
        
        // Try local /models first (if user adds models under public/models), else fallback to CDN
        const localBase = '/models';
        const cdnBase = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.10/model';
        try {
          console.log('[face-api] Attempting to load models from local:', localBase);
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(localBase),
            faceapi.nets.ageGenderNet.loadFromUri(localBase),
          ]);
          console.log('[face-api] Models loaded from local');
          if (mounted) setAgeModelsLoaded(true);
        } catch (localErr) {
          console.log('[face-api] Local models failed, trying CDN:', localErr);
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(cdnBase),
            faceapi.nets.ageGenderNet.loadFromUri(cdnBase),
          ]);
          console.log('[face-api] Models loaded from CDN');
          if (mounted) setAgeModelsLoaded(true);
        }
      } catch (e) {
        console.warn('[face-api] Model load failed, age estimation disabled:', e);
        if (mounted) setAgeModelsLoaded(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const captureImage = (): string | null => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw the current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64 data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const processMedicalFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file, file.name || 'upload.jpg');
    const res = await fetch('/api/medical', { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Medical inference failed: ${res.status}`);
    const data = await res.json();
    
    // Debug: Log medical API response
    console.log('Medical API Response:', JSON.stringify(data, null, 2));
    
    const primaryLabel: string = data?.predicted_label ?? data?.label ?? (Array.isArray(data?.top_k) ? data.top_k[0]?.label : undefined) ?? 'Eczema';
    const primaryScore: number | undefined = data?.score ?? (Array.isArray(data?.top_k) ? data.top_k[0]?.score : undefined);
    const topK = data?.top_k ?? [];
    
    const normalizedLabel = mapApiLabelToCondition(primaryLabel);
    
    // Normal condition should ALWAYS be low risk, regardless of confidence
    let risk: 'low' | 'medium' | 'high';
    if (normalizedLabel === 'normal') {
      risk = 'low';
    } else {
      risk = riskFromConfidence(primaryScore, primaryLabel, topK);
    }
    
    // Debug: Log mapped result
    console.log('Mapped MedicalScanResult:', {
      primaryLabel,
      primaryScore,
      normalizedLabel,
      risk,
      topK: topK.slice(0, 3).map((item: any) => ({ label: item?.label, score: item?.score })),
    });
    
    const result: MedicalScanResult = {
      condition_match: normalizedLabel,
      risk_flag: risk,
      visual_markers: [],
    };
    return result;
  };

  const processCosmeticFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file, file.name || 'upload.jpg');
    const res = await fetch('/api/cosmetic', { method: 'POST', body: form });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      const errorMsg = errorData.message || errorData.body || errorData.error || res.statusText;
      console.error('Cosmetic API error:', errorData);
      throw new Error(`Cosmetic inference failed: ${errorMsg}`);
    }
    const data = await res.json();
    return mapCosmeticApiResponse(data);
  };

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleAfterResult = async (result: CosmeticScanResult | MedicalScanResult, imageData: string) => {
    // Set results based on agent type
    if (activeAgent === 'cosmetic') {
      setLastCosmeticScan(result as CosmeticScanResult);
    } else {
      setLastMedicalScan(result as MedicalScanResult);
    }

    // Save scan result to Firestore
    if (authUser?.uid) {
      try {
        await saveScanResult(authUser.uid, {
          agentType: activeAgent,
          result,
          imageUrl: imageData, // base64; in production, upload to Storage first
          timestamp: new Date(),
        });
      } catch (error) {
        console.error('Error saving scan to Firestore:', error);
      }
    }

    // Navigate to dashboard
    router.push('/dashboard');

    // Trigger agent message after navigation
    setTimeout(async () => {
      if (!user) return;
      
      if (activeAgent === 'medical') {
        // Run medical agent to determine risk level via server API
        try {
          const res = await fetch('/api/agents/medical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              scan: result as MedicalScanResult,
              userProfile: user,
              weather,
            }),
          });

          if (res.ok) {
            const medicalOut = await res.json();
            console.log('[Scan] Medical agent response:', medicalOut);
            // Show dermatologist popup 8 seconds after scan for high/medium risk
            if (medicalOut.requiresDermatologist) {
              const dialogData = {
                urgency: medicalOut.urgency,
                condition: (result as MedicalScanResult).condition_match,
                message: medicalOut.message,
                tips: medicalOut.tips,
              };
              
              // Delay popup by 8 seconds after scan completes
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  // Dispatch custom event to trigger popup on dashboard
                  window.dispatchEvent(new CustomEvent('showDermatologistReferral', {
                    detail: dialogData,
                  }));
                }
              }, 8000);
            }
          }
        } catch (err) {
          console.error('Failed to run medical agent:', err);
        }

      setTyping(true);
      setTimeout(() => {
        setTyping(false);
          const agentResponse = AgentAdapter.fromMedicalScan(
            result as MedicalScanResult,
            user,
            weather
          );
          pushMessage(agentResponse);
          openDrawer();
        }, 1500);
      } else {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          const agentResponse = AgentAdapter.fromCosmeticScan(
              result as CosmeticScanResult,
              user,
              weather
            );
        pushMessage(agentResponse);
        openDrawer();
      }, 1500);
      }
    }, 500);
  };

  const handleFileSelected = async (file: File) => {
    setIsScanning(true);
    try {
      // Optional: stop stream to save resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      if (activeAgent === 'medical') {
        const result = await processMedicalFile(file);
        // For consistency with our storage and adapter, also generate a data URL preview
        const imageData = await fileToDataUrl(file);
        await handleAfterResult(result, imageData);
      } else {
        // Cosmetic scan - use real API endpoint
        const result = await processCosmeticFile(file);
        const imageData = await fileToDataUrl(file);
        await handleAfterResult(result, imageData);
      }
    } catch (err) {
      console.error('Upload scan failed:', err);
      setCameraError('Failed to process uploaded image. Try another image.');
      setIsScanning(false);
    }
  };

  const handleCapture = async () => {
    if (!isCameraReady || !videoRef.current) {
      setCameraError('Camera not ready. Please wait...');
      return;
    }

    setIsScanning(true);
    setCameraError(null);

    try {
      // Capture image from video
      const imageData = captureImage();
      
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      // If cosmetic agent, attempt on-device age estimation via face-api.js BEFORE stopping camera
      if (activeAgent === 'cosmetic') {
        console.log('[face-api] Age detection check:', { ageModelsLoaded, hasFaceapi: !!faceapiRef.current, hasVideo: !!videoRef.current });
        if (ageModelsLoaded && faceapiRef.current && videoRef.current) {
          try {
            const faceapi = faceapiRef.current;
            // Create a canvas from the video frame for age detection
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              console.log('[face-api] Running age detection on canvas:', canvas.width, 'x', canvas.height);
              const det = await faceapi
                .detectSingleFace(
                  canvas,
                  new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
                )
                .withAgeAndGender();
              console.log('[face-api] Detection result:', det);
              if (det && typeof det.age === 'number') {
                (window as any).__faceAge = Math.round(det.age);
                console.log('[face-api] Estimated age:', (window as any).__faceAge, 'gender:', det.gender);
              } else {
                console.log('[face-api] No face detected or invalid age');
              }
            }
          } catch (e) {
            console.warn('[face-api] Age estimation failed:', e);
          }
        } else {
          console.log('[face-api] Age detection skipped - models not ready');
        }
      }

      // Stop camera stream AFTER age detection
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      let result: CosmeticScanResult | MedicalScanResult;

      if (activeAgent === 'medical') {
        // Convert data URL to Blob and send to our proxy route
        const blob = await (await fetch(imageData)).blob();
        const form = new FormData();
        form.append('file', blob, 'scan.jpg');

        const res = await fetch('/api/medical', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          throw new Error(`Medical inference failed: ${res.status}`);
        }

        const data = await res.json();
        
        // Debug: Log medical API response
        console.log('Medical API Response:', JSON.stringify(data, null, 2));
        
        // Expected schema per sample: { predicted_label: string, score: number, top_k: [{label, score}], probabilities: {...} }
        const primaryLabel: string = data?.predicted_label ?? data?.label ?? (Array.isArray(data?.top_k) ? data.top_k[0]?.label : undefined) ?? 'Eczema';
        const primaryScore: number | undefined = data?.score ?? (Array.isArray(data?.top_k) ? data.top_k[0]?.score : undefined);
        const topK = data?.top_k ?? [];

        const normalizedLabel = mapApiLabelToCondition(primaryLabel);
        
        // Normal condition should ALWAYS be low risk, regardless of confidence
        let risk: 'low' | 'medium' | 'high';
        if (normalizedLabel === 'normal') {
          risk = 'low';
        } else {
          risk = riskFromConfidence(primaryScore, primaryLabel, topK);
        }
        
        // Debug: Log mapped result
        console.log('Mapped MedicalScanResult:', {
          primaryLabel,
          primaryScore,
          normalizedLabel,
          risk,
          topK: topK.slice(0, 3).map((item: any) => ({ label: item?.label, score: item?.score })),
        });
        
        result = {
          condition_match: normalizedLabel,
          risk_flag: risk,
          visual_markers: [],
        } as MedicalScanResult;
      } else {
        // Cosmetic scan - use real API endpoint
        // Convert data URL to Blob and send to our proxy route
        const blob = await (await fetch(imageData)).blob();
        const form = new FormData();
        form.append('file', blob, 'scan.jpg');

        const res = await fetch('/api/cosmetic', {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          const errorMsg = errorData.message || errorData.body || errorData.error || res.statusText;
          console.error('Cosmetic API error:', errorData);
          throw new Error(`Cosmetic inference failed: ${errorMsg}`);
        }

        const data = await res.json();
        result = mapCosmeticApiResponse(data) as CosmeticScanResult;
      }

      await handleAfterResult(result, imageData);
    } catch (error) {
      console.error('Error during scan:', error);
      setCameraError('Failed to process scan. Please try again.');
      setIsScanning(false);
      
      // Restart camera if error occurred
      if (videoRef.current && !streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: activeAgent === 'cosmetic' ? 'user' : 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.play();
        setIsCameraReady(true);
      }
    }
  };

  return (
    <>
      {/* Dermatologist Referral Dialog */}
      {dermatologistDialogData && (
        <DermatologistReferralDialog
          open={showDermatologistDialog}
          onClose={() => setShowDermatologistDialog(false)}
          urgency={dermatologistDialogData.urgency}
          condition={dermatologistDialogData.condition}
          message={dermatologistDialogData.message}
          tips={dermatologistDialogData.tips}
        />
      )}
      
      <TopBar />
      <MobileContainer noPadding className="pb-20">
        {/* Camera Viewport */}
        <div className="relative h-[calc(100vh-180px)] bg-black overflow-hidden">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              !isCameraReady && 'opacity-0'
            )}
          />

          {/* Hidden file input for uploads */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
              // reset so same file can be reselected
              e.currentTarget.value = '';
            }}
          />

          {/* Loading/Camera Error State */}
          {(!isCameraReady || cameraError) && (
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
              <div className="text-center text-white/60 px-4">
                {cameraError ? (
                  <>
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-red-400" />
                    <p className="text-sm mb-2">{cameraError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="mt-4"
                    >
                      Retry
                    </Button>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-16 h-16 mx-auto mb-4 opacity-50 animate-spin" />
                    <p className="text-sm">Starting camera...</p>
                    <p className="text-xs opacity-50 mt-2">Please allow camera access</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Overlay based on agent type */}
          {isCameraReady && !cameraError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none z-10"
            >
            {activeAgent === 'cosmetic' ? (
              // Face outline for cosmetic
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                <ellipse
                  cx="50"
                  cy="45"
                  rx="25"
                  ry="32"
                  fill="none"
                  stroke="rgba(251, 146, 60, 0.6)"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                <text
                  x="50"
                  y="85"
                  textAnchor="middle"
                  fill="rgba(251, 146, 60, 0.8)"
                  fontSize="3"
                >
                  Align your face within the oval
                </text>
              </svg>
            ) : (
              // Focus box for medical
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-teal-300" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-teal-300" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-teal-300" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-teal-300" />
                  
                  {/* Center target */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Target className="w-8 h-8 text-teal-300/50" />
                  </div>
                </div>
                <p className="absolute bottom-20 left-0 right-0 text-center text-teal-300/80 text-sm">
                  Position the concern area in the frame
                </p>
              </div>
            )}
          </motion.div>
          )}

          {/* Lighting instruction */}
          {isCameraReady && !cameraError && !isScanning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-20 left-0 right-0 px-4 z-20"
            >
              <div className={cn(
                "max-w-md mx-auto bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2.5 border",
                activeAgent === 'cosmetic'
                  ? "border-orange-500/30"
                  : "border-teal-500/30"
              )}>
                <p className={cn(
                  "text-center text-sm font-medium",
                  activeAgent === 'cosmetic'
                    ? "text-orange-200"
                    : "text-teal-200"
                )}>
                  💡 Take photo in proper lighting for best results
                </p>
              </div>
            </motion.div>
          )}

          {/* Scanning overlay */}
          {isScanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                <p className="font-medium">Analyzing...</p>
                <p className="text-sm text-white/60">
                  {activeAgent === 'cosmetic' 
                    ? 'Detecting skin conditions' 
                    : 'Assessing risk level'}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-24 left-0 right-0 px-4">
          <div className="max-w-md mx-auto flex items-center justify-center gap-4">
            {/* Cancel Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full bg-white/10 border-white/20 text-white"
              onClick={() => router.back()}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Capture Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleCapture}
              disabled={isScanning || !isCameraReady || !!cameraError}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                'transition-all',
                activeAgent === 'cosmetic'
                  ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                  : 'bg-gradient-to-br from-teal-300 to-cyan-400',
                (isScanning || !isCameraReady || !!cameraError) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
                {isScanning ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <ScanFace className="w-6 h-6 text-white" />
                )}
              </div>
            </motion.button>

            {/* Upload Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full bg-white/10 border-white/20 text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              title="Upload image"
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </MobileContainer>
      <BottomNav />
      <DevTools />
    </>
  );
}

