/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, HandLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

export const useMediaPipe = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [fingerCount, setFingerCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  
  // Detect mobile for optimizations
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const DETECTION_INTERVAL = isMobile ? 66 : 0; // ~15 FPS detection on mobile is enough for rhythm, saves CPU
  
  // Temporal smoothing: store recent finger counts
  const fingerHistoryRef = useRef<number[]>([]);
  const HISTORY_SIZE = isMobile ? 3 : 5; // Smaller history for faster response on mobile

  // Get MODE (most frequent value) from array
  const getMode = (arr: number[]): number => {
    const freq: Record<number, number> = {};
    let maxFreq = 0;
    let mode = arr[0];
    for (const n of arr) {
      freq[n] = (freq[n] || 0) + 1;
      if (freq[n] > maxFreq) {
        maxFreq = freq[n];
        mode = n;
      }
    }
    return mode;
  };

  // Helper: Calculate angle at point B given points A, B, C (in degrees)
  const getAngle = (a: NormalizedLandmark, b: NormalizedLandmark, c: NormalizedLandmark): number => {
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    if (magAB === 0 || magCB === 0) return 180; // Avoid division by zero
    const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB))); // Clamp to [-1, 1]
    return Math.acos(cosAngle) * (180 / Math.PI);
  };

  // Helper: Count extended fingers using HYBRID detection (angle + distance)
  const countFingers = (landmarks: NormalizedLandmark[]): number => {
      if (!landmarks || landmarks.length < 21) return 0;
      
      const wrist = landmarks[0];
      const indexMCP = landmarks[5];
      
      // Scale reference: Distance from Wrist to Index MCP (Palm size approx)
      const scale = Math.hypot(indexMCP.x - wrist.x, indexMCP.y - wrist.y);
      
      let count = 0;
      
      // --- THUMB (Points 1, 2, 3, 4) ---
      const thumbMCP = landmarks[2];
      const thumbIP = landmarks[3];
      const thumbTip = landmarks[4];
      
      // Linearity check for thumb
      const distMCP_IP = Math.hypot(thumbIP.x - thumbMCP.x, thumbIP.y - thumbMCP.y);
      const distIP_Tip = Math.hypot(thumbTip.x - thumbIP.x, thumbTip.y - thumbIP.y);
      const distMCP_Tip = Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y);
      const linearity = distMCP_Tip / (distMCP_IP + distIP_Tip);
      
      // Abduction check (thumb away from palm)
      const distTip_IndexMCP = Math.hypot(thumbTip.x - indexMCP.x, thumbTip.y - indexMCP.y);
      
      // Thumb is extended if: mostly straight AND far from index knuckle
      if (linearity > 0.85 && distTip_IndexMCP > scale * 0.5) {
          count++;
      }

      // --- FINGERS (Index, Middle, Ring, Pinky) ---
      // HYBRID: Both angle AND distance must pass
      
      const fingers = [
          { name: 'index', mcp: 5, pip: 6, tip: 8 },
          { name: 'middle', mcp: 9, pip: 10, tip: 12 },
          { name: 'ring', mcp: 13, pip: 14, tip: 16 },
          { name: 'pinky', mcp: 17, pip: 18, tip: 20 }
      ];

      for (const f of fingers) {
          const mcp = landmarks[f.mcp];
          const pip = landmarks[f.pip];
          const tip = landmarks[f.tip];
          
          // CHECK 1: Angle at PIP joint (must be > 160° for extended)
          const pipAngle = getAngle(mcp, pip, tip);
          
          // CHECK 2: Tip must be further from wrist than MCP (extended = tip is out)
          const distWristTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
          const distWristMCP = Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y);
          
          // BOTH conditions must be true
          const isAngleStraight = pipAngle > 160;
          const isTipExtended = distWristTip > distWristMCP * 1.2; // Tip 20% further than MCP
          
          if (isAngleStraight && isTipExtended) {
              count++;
          }
      }
      
      return count;
  };

  useEffect(() => {
    let isActive = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        if (!isActive) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.7
        });

        if (!isActive) {
             landmarker.close();
             return;
        }

        landmarkerRef.current = landmarker;
        startCamera();
      } catch (err: any) {
        console.error("Error initializing MediaPipe:", err);
        setError(`Failed to load hand tracking: ${err.message}`);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: isMobile ? 480 : 1280 },
            height: { ideal: isMobile ? 360 : 720 }
          }
        });

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
             if (isActive) {
                 setIsCameraReady(true);
                 predictWebcam();
             }
          };
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setError("Could not access camera.");
      }
    };

    const predictWebcam = () => {
        if (!videoRef.current || !landmarkerRef.current || !isActive) return;

        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
             const startTimeMs = performance.now();
             
             // Throttle detection on mobile to save battery and reduce heat
             if (isMobile && startTimeMs - lastDetectionTimeRef.current < DETECTION_INTERVAL) {
                requestRef.current = requestAnimationFrame(predictWebcam);
                return;
             }
             lastDetectionTimeRef.current = startTimeMs;

             try {
                 const results = landmarkerRef.current.detectForVideo(video, startTimeMs);
                 
                 if (results.landmarks && results.landmarks.length > 0) {
                     const lm = results.landmarks[0];
                     landmarksRef.current = lm;
                     const count = countFingers(lm);
                     
                     // Add to history buffer for temporal smoothing
                     fingerHistoryRef.current.push(count);
                     if (fingerHistoryRef.current.length > HISTORY_SIZE) {
                       fingerHistoryRef.current.shift();
                     }
                     
                     // Use MODE (most frequent value) for stability
                     const smoothedCount = fingerHistoryRef.current.length >= 3 
                       ? getMode(fingerHistoryRef.current) 
                       : count;
                     
                     // Only update state if number changes to avoid re-renders
                     setFingerCount(prev => prev === smoothedCount ? prev : smoothedCount);
                 } else {
                     landmarksRef.current = null;
                     // Clear history when no hand detected
                     fingerHistoryRef.current = [];
                     setFingerCount(0);
                 }
             } catch (e) {
                 console.warn("Detection failed this frame", e);
             }
        }
        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    setupMediaPipe();

    return () => {
      isActive = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [videoRef]);

  return { isCameraReady, fingerCount, error, landmarksRef };
};