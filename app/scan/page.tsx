'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, ScanFace, Target, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileContainer, TopBar, BottomNav } from '@/components/layout';
import { DevTools } from '@/components/dev';
import { useAgent, useUser, useAuth, useAgentUI, useWeather } from '@/lib/contexts';
import { analyzeSkin } from '@/lib/mock/ai-service';
import { saveScanResult } from '@/lib/firebase/firestore';
import { AgentAdapter } from '@/lib/logic/agentAdapter';
import { CosmeticScanResult, MedicalScanResult } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const { activeAgent, setLastCosmeticScan, setLastMedicalScan } = useAgent();
  const { user } = useUser();
  const { user: authUser } = useAuth();
  const { weather } = useWeather();
  const { pushMessage, setTyping, openDrawer } = useAgentUI();
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Analyze with AI service
      const result = await analyzeSkin(
        imageData,
        activeAgent,
        {
          preset: activeAgent === 'cosmetic' ? 'acne-pih' : 'eczema',
          fitzpatrickScale: user?.fitzpatrickScale || 4,
        }
      );

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
            imageUrl: imageData, // Save base64 image (in production, upload to Storage first)
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('Error saving scan to Firestore:', error);
          // Continue even if save fails
        }
      }

      // Navigate to dashboard
      router.push('/dashboard');

      // Trigger agent message after navigation
      setTimeout(() => {
        if (!user) return;
        
        setTyping(true);
        
        // Simulate thinking time
        setTimeout(() => {
          setTyping(false);
          
          // Generate agent response
          const agentResponse = activeAgent === 'cosmetic'
            ? AgentAdapter.fromCosmeticScan(
                result as CosmeticScanResult,
                user,
                weather
              )
            : AgentAdapter.fromMedicalScan(
                result as MedicalScanResult,
                weather
              );
          
          pushMessage(agentResponse);
          openDrawer();
        }, 1500);
      }, 500);
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

            {/* Placeholder for gallery button */}
            <div className="w-12 h-12" />
          </div>
        </div>
      </MobileContainer>
      <BottomNav />
      <DevTools />
    </>
  );
}

