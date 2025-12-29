/**
 * Unified Hand Detection Hook
 * Supports both MediaPipe and TensorFlow.js backends
 */

import React, { useEffect, useRef, useState } from "react";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type DetectionEngine = "mediapipe" | "tensorflow";

// Detect mobile once outside the hook
const IS_MOBILE =
  typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// ============== Shared Helpers ==============

const getDistanceSq3D = (
  a: NormalizedLandmark,
  b: NormalizedLandmark,
  ratio: number = 1
): number => {
  const dx = (a.x - b.x) * ratio;
  const dy = a.y - b.y;
  const dz = (a.z - b.z) * ratio;
  return dx * dx + dy * dy + dz * dz;
};

export const countFingers = (
  landmarks: NormalizedLandmark[],
  ratio: number
): number => {
  if (!landmarks || landmarks.length < 21) return 0;

  const wrist = landmarks[0];
  const PinkyMCP = landmarks[17];
  let count = 0;

  // --- THUMB ---
  const thumbIP = landmarks[3];
  const thumbTip = landmarks[4];
  const indexMCP = landmarks[5];

  const distSqTipToPinky = getDistanceSq3D(thumbTip, PinkyMCP, ratio);
  const distSqIpToPinky = getDistanceSq3D(thumbIP, PinkyMCP, ratio);

  if (distSqTipToPinky > distSqIpToPinky * 1.3225) {
    const distSqTipToWrist = getDistanceSq3D(thumbTip, wrist, ratio);
    const distSqMcpToWrist = getDistanceSq3D(landmarks[2], wrist, ratio);
    const distSqTipToIndex = getDistanceSq3D(thumbTip, indexMCP, ratio);
    const distSqMcpToIndex = getDistanceSq3D(landmarks[2], indexMCP, ratio);

    if (
      distSqTipToWrist > distSqMcpToWrist * 0.7 &&
      distSqTipToIndex > distSqMcpToIndex * 1.1
    ) {
      count++;
    }
  }

  // --- FINGERS ---
  const fingers = [
    { mcp: 5, tip: 8 },
    { mcp: 9, tip: 12 },
    { mcp: 13, tip: 16 },
    { mcp: 17, tip: 20 },
  ];

  for (const f of fingers) {
    const mcp = landmarks[f.mcp];
    const tip = landmarks[f.tip];
    const distSqWristTip = getDistanceSq3D(wrist, tip, ratio);
    const distSqWristMcp = getDistanceSq3D(wrist, mcp, ratio);
    if (distSqWristTip > distSqWristMcp * 1.8225) {
      count++;
    }
  }

  return count;
};

const getMode = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  let maxFreq = 0;
  let mode = arr[0];
  for (let i = 0; i < arr.length; i++) {
    let c = 0;
    for (let j = 0; j < arr.length; j++) {
      if (arr[i] === arr[j]) c++;
    }
    if (c > maxFreq) {
      maxFreq = c;
      mode = arr[i];
    }
  }
  return mode;
};

// ============== Unified Hook ==============

export const useHandDetection = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  engine: DetectionEngine = "mediapipe",
  onCountUpdate?: (count: number) => void
) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [currentEngine, setCurrentEngine] = useState<DetectionEngine>(engine);

  // Shared refs
  const detectorRef = useRef<any>(null);
  const requestRef = useRef<number>(0);
  const landmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const fingerCountRef = useRef<number>(0);
  const lastDetectionTimeRef = useRef<number>(0);
  const lastCountRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const fingerHistoryRef = useRef<number[]>([]);
  
  // Track actual active engine (ref for use in detection loop)
  const activeEngineRef = useRef<DetectionEngine>(engine);
  const isModelReadyRef = useRef<boolean>(false);

  const HISTORY_SIZE = IS_MOBILE ? 3 : 5;

  // Detection intervals (TensorFlow.js can run slightly faster)
  const DETECTION_INTERVAL =
    engine === "tensorflow" ? (IS_MOBILE ? 45 : 35) : 55;

  useEffect(() => {
    let isActive = true;
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ============== MediaPipe Setup ==============
    const setupMediaPipe = async () => {
      try {
        setIsModelLoading(true);
        console.log("MediaPipe: Loading model...");

        const { FilesetResolver, HandLandmarker } = await import(
          "@mediapipe/tasks-vision"
        );

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        if (!isActive) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (!isActive) {
          landmarker.close();
          return;
        }

        detectorRef.current = landmarker;
        activeEngineRef.current = "mediapipe";
        isModelReadyRef.current = true;
        setCurrentEngine("mediapipe");
        setIsModelLoading(false);
        console.log("MediaPipe: Ready");
      } catch (err: any) {
        console.error("Error initializing MediaPipe:", err);
        setError(`Failed to load MediaPipe: ${err.message}`);
        setIsModelLoading(false);
      }
    };

    // ============== TensorFlow.js Setup (using MediaPipe runtime for same output format) ==============
    const setupTensorFlow = async () => {
      try {
        setIsModelLoading(true);
        console.log("TensorFlow.js: Loading model with MediaPipe runtime...");

        // Dynamic import with @vite-ignore to skip static analysis
        let handPoseDetection: any;
        
        try {
          handPoseDetection = await import(/* @vite-ignore */ "@tensorflow-models/hand-pose-detection");
        } catch (importErr) {
          console.warn("TensorFlow.js packages not installed. Falling back to MediaPipe.");
          await setupMediaPipe();
          return;
        }

        if (!isActive) return;

        // Use MediaPipe runtime - gives same normalized landmark format as our MediaPipe code
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detector = await handPoseDetection.createDetector(model, {
          runtime: "mediapipe",
          solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
          modelType: IS_MOBILE ? "lite" : "full",
          maxHands: 1,
        });

        if (!isActive) {
          detector.dispose();
          return;
        }

        detectorRef.current = detector;
        activeEngineRef.current = "tensorflow";
        isModelReadyRef.current = true;
        setCurrentEngine("tensorflow");
        setIsModelLoading(false);
        console.log("TensorFlow.js (MediaPipe runtime): Ready");
      } catch (err: any) {
        console.error("Error initializing TensorFlow.js:", err);
        console.warn("Falling back to MediaPipe due to TensorFlow.js error");
        await setupMediaPipe();
      }
    };

    // ============== Camera Setup ==============
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            if (isActive) {
              setIsCameraReady(true);
              startLoop();
            }
          };
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setError("Could not access camera.");
      }
    };

    // ============== Detection Loop ==============
    const predictWebcam = async (time?: number) => {
      if (
        !videoRef.current ||
        !detectorRef.current ||
        !isActive ||
        !isTabVisible ||
        isProcessingRef.current ||
        !isModelReadyRef.current  // Wait for model to be ready
      ) {
        scheduleNextFrame();
        return;
      }

      const video = videoRef.current;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const startTimeMs = time || performance.now();

        if (startTimeMs - lastDetectionTimeRef.current < DETECTION_INTERVAL) {
          scheduleNextFrame();
          return;
        }
        lastDetectionTimeRef.current = startTimeMs;
        isProcessingRef.current = true;

        try {
          let currentCount = 0;
          const ratio = video.videoWidth / video.videoHeight;

          // Both engines now use similar detection APIs
          if (activeEngineRef.current === "mediapipe") {
            // MediaPipe Tasks Vision - uses detectForVideo with bitmap
            const bitmap = await createImageBitmap(video, {
              resizeWidth: 320,
              resizeHeight: 240,
              resizeQuality: "low",
            });

            const results = detectorRef.current.detectForVideo(
              bitmap,
              Math.round(video.currentTime * 1000)
            );
            bitmap.close();

            if (results.landmarks && results.landmarks.length > 0) {
              landmarksRef.current = results.landmarks[0];
              currentCount = countFingers(results.landmarks[0], ratio);
              console.log("MediaPipe: Finger count:", currentCount);
            } else {
              landmarksRef.current = null;
            }
          } else {
            // TensorFlow.js with MediaPipe runtime - uses estimateHands
            const hands = await detectorRef.current.estimateHands(video, {
              flipHorizontal: false,
            });

            if (hands && hands.length > 0) {
              const hand = hands[0];
              const vw = video.videoWidth || 640;
              const vh = video.videoHeight || 480;
              
              // Keypoints are in pixel coordinates, normalize to 0-1
              const landmarks: NormalizedLandmark[] = hand.keypoints.map(
                (kp: any, index: number) => ({
                  x: kp.x / vw,
                  y: kp.y / vh,
                  z: hand.keypoints3D?.[index]?.z ?? 0,
                })
              );
              
              landmarksRef.current = landmarks;
              currentCount = countFingers(landmarks, ratio);
              console.log("TensorFlow.js: Finger count:", currentCount);
            } else {
              landmarksRef.current = null;
            }
          }

          // Smoothing
          fingerHistoryRef.current.push(currentCount);
          if (fingerHistoryRef.current.length > HISTORY_SIZE) {
            fingerHistoryRef.current.shift();
          }

          const smoothedCount =
            fingerHistoryRef.current.length >= 2
              ? getMode(fingerHistoryRef.current)
              : currentCount;

          fingerCountRef.current = smoothedCount;

          if (lastCountRef.current !== smoothedCount) {
            lastCountRef.current = smoothedCount;
            if (onCountUpdate) onCountUpdate(smoothedCount);
          }
        } catch (e) {
          console.warn("Detection error:", e);
        } finally {
          isProcessingRef.current = false;
        }
      }
      scheduleNextFrame();
    };

    const scheduleNextFrame = () => {
      if (!isActive) return;
      const video = videoRef.current;
      if (video && (video as any).requestVideoFrameCallback) {
        (video as any).requestVideoFrameCallback(predictWebcam);
      } else {
        requestRef.current = requestAnimationFrame(() => predictWebcam());
      }
    };

    const startLoop = () => {
      scheduleNextFrame();
    };

    // Initialize based on selected engine
    if (engine === "tensorflow") {
      setupTensorFlow();
    } else {
      setupMediaPipe();
    }
    startCamera();

    return () => {
      isActive = false;
      isModelReadyRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);

      // Cleanup detector (use ref for actual engine type)
      if (detectorRef.current) {
        if (activeEngineRef.current === "mediapipe") {
          detectorRef.current.close?.();
        } else {
          detectorRef.current.dispose?.();
        }
        detectorRef.current = null;
      }

      // Cleanup camera
      if (videoRef.current) {
        const video = videoRef.current;
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((t) => t.stop());
        }
      }
    };
  }, [videoRef, engine]);

  return {
    isCameraReady,
    error,
    landmarksRef,
    fingerCountRef,
    isModelLoading,
    currentEngine,
  };
};

