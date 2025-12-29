// Hand Detection Worker - Offloads TensorFlow.js detection from main thread
// Uses OffscreenCanvas for GPU-accelerated detection

declare const self: Worker & typeof globalThis;

interface DetectionResult {
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  frameId: number;
}

let detector: any = null;
let isModelReady = false;
let isModelLoading = false;
const IS_MOBILE = typeof navigator !== "undefined" &&
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize TensorFlow.js and detector
async function initDetector() {
  if (isModelLoading) return;
  
  try {
    isModelLoading = true;
    console.log("[Worker] Loading TensorFlow.js model...");

    // Dynamic imports for TensorFlow.js
    const handPoseDetection = await import(
      /* @vite-ignore */ "@tensorflow-models/hand-pose-detection"
    );

    // Use MediaPipe runtime - gives same normalized landmark format
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detector = await handPoseDetection.createDetector(model, {
      runtime: "mediapipe",
      solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands",
      modelType: IS_MOBILE ? "lite" : "full",
      maxHands: 1,
    });

    isModelReady = true;
    isModelLoading = false;
    console.log("[Worker] TensorFlow.js detector ready");
    self.postMessage({ type: "ready" });
  } catch (err: any) {
    isModelLoading = false;
    console.error("[Worker] Error initializing detector:", err);
    self.postMessage({ 
      type: "error", 
      payload: { message: err.message || "Failed to load detector" } 
    });
  }
}

// Process video frame and detect hands
async function detectHands(
  videoBitmap: ImageBitmap,
  videoWidth: number,
  videoHeight: number
): Promise<Array<{ x: number; y: number; z: number }> | null> {
  if (!detector || !isModelReady) {
    return null;
  }

  try {
    // Create OffscreenCanvas from ImageBitmap for detection
    const canvas = new OffscreenCanvas(videoWidth, videoHeight);
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      console.error("[Worker] Failed to get 2d context");
      return null;
    }

    // Draw video frame to canvas
    ctx.drawImage(videoBitmap, 0, 0, videoWidth, videoHeight);

    // Detect hands using TensorFlow.js
    const hands = await detector.estimateHands(canvas as any, {
      flipHorizontal: false,
    });

    // Convert to normalized landmarks format (same as MediaPipe)
    if (hands && hands.length > 0) {
      const hand = hands[0];
      const landmarks = hand.keypoints.map((kp: any, index: number) => ({
        x: kp.x / videoWidth,
        y: kp.y / videoHeight,
        z: hand.keypoints3D?.[index]?.z ?? 0,
      }));

      return landmarks;
    }

    return null;
  } catch (err) {
    console.error("[Worker] Detection error:", err);
    return null;
  }
}

// Message handler
self.addEventListener("message", async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "init":
        await initDetector();
        break;

      case "detect":
        if (!isModelReady) {
          // Wait for model to be ready
          const checkReady = setInterval(() => {
            if (isModelReady) {
              clearInterval(checkReady);
              handleDetection(payload);
            }
          }, 50);
          return;
        }
        await handleDetection(payload);
        break;

      case "terminate":
        if (detector) {
          detector.dispose?.();
          detector = null;
        }
        isModelReady = false;
        break;
    }
  } catch (err: any) {
    console.error("[Worker] Error handling message:", err);
    self.postMessage({
      type: "error",
      payload: { message: err.message || "Unknown error" },
    });
  }
});

// Handle detection request
async function handleDetection(payload: any) {
  const { videoBitmap, videoWidth, videoHeight, frameId } = payload;

  if (!videoBitmap) {
    console.warn("[Worker] No video bitmap provided");
    return;
  }

  const landmarks = await detectHands(videoBitmap, videoWidth, videoHeight);

  // Close bitmap to free memory immediately
  videoBitmap.close();

  // Send result back to main thread
  self.postMessage({
    type: "detection",
    payload: { landmarks, frameId },
  });
}

console.log("[Worker] Hand Detection Worker loaded");

