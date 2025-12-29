// Hand Detection Worker - Offloads TensorFlow.js detection from main thread
// Uses OffscreenCanvas for GPU-accelerated detection

// Define atob/btoa globally BEFORE any imports or type declarations
// TensorFlow.js checks for these during module initialization
globalThis.atob = (base64: string): string => {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const enc1 = base64Chars.indexOf(cleanBase64[i]);
    const enc2 = base64Chars.indexOf(cleanBase64[i + 1]);
    const enc3 = base64Chars.indexOf(cleanBase64[i + 2]);
    const enc4 = base64Chars.indexOf(cleanBase64[i + 3]);
    
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    
    result += String.fromCharCode(chr1);
    
    if (enc3 !== 64 && enc3 !== -1) {
      result += String.fromCharCode(chr2);
    }
    if (enc4 !== 64 && enc4 !== -1) {
      result += String.fromCharCode(chr3);
    }
  }
  
  return result;
};

globalThis.btoa = (str: string): string => {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  
  for (let i = 0; i < str.length; i += 3) {
    const byte1 = str.charCodeAt(i);
    const byte2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
    const byte3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
    
    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const enc4 = byte3 & 63;
    
    result += base64Chars[enc1] + base64Chars[enc2];
    result += i + 1 < str.length ? base64Chars[enc3] : "=";
    result += i + 2 < str.length ? base64Chars[enc4] : "=";
  }
  
  return result;
};

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
    const tf = await import("@tensorflow/tfjs");
    const handPoseDetection = await import(
      /* @vite-ignore */ "@tensorflow-models/hand-pose-detection"
    );

    // Initialize TensorFlow.js backend in worker
    await tf.setBackend("webgl");
    await tf.ready();
    console.log("[Worker] TensorFlow.js backend ready:", tf.getBackend());

    // Use TensorFlow.js runtime (not MediaPipe) - required for module workers
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    detector = await handPoseDetection.createDetector(model, {
      runtime: "tfjs", // ✅ Changed from "mediapipe" to "tfjs"
      modelType: IS_MOBILE ? "lite" : "full",
      maxHands: 1,
    });

    isModelReady = true;
    isModelLoading = false;
    console.log("[Worker] TensorFlow.js detector ready");
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/009f2daa-00f2-4661-b284-18865ef5561f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handDetection.worker.ts:95',message:'Worker detector initialized',data:{isModelReady,modelType:IS_MOBILE?'lite':'full'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    self.postMessage({ type: "ready" });
  } catch (err: any) {
    isModelLoading = false;
    console.error("[Worker] Error initializing detector:", err);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/009f2daa-00f2-4661-b284-18865ef5561f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handDetection.worker.ts:105',message:'Worker init error',data:{errorMsg:err.message,errorStack:err.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/009f2daa-00f2-4661-b284-18865ef5561f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handDetection.worker.ts:130',message:'Worker detection result',data:{handsDetected:hands?.length||0,hasHands:!!(hands&&hands.length>0)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,F'})}).catch(()=>{});
    // #endregion

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

