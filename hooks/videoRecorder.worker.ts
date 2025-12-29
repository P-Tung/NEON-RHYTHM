// Video Recorder Worker - Offloads canvas drawing from main thread
// Uses OffscreenCanvas for rendering video frames with overlays

// Worker global scope with proper types
declare const self: Worker & typeof globalThis;

interface DrawState {
  overlayLines: string[];
  failInfo: { show: boolean; round: number };
  isMobile: boolean;
}

let offscreenCanvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let canvasWidth = 720;
let canvasHeight = 1280;
let isMobile = false;

// Current state (updated via messages)
let overlayLines: string[] = [];
let failInfo = { show: false, round: 1 };

// Initialize the OffscreenCanvas
function initCanvas(width: number, height: number, mobile: boolean) {
  canvasWidth = width;
  canvasHeight = height;
  isMobile = mobile;
  
  offscreenCanvas = new OffscreenCanvas(width, height);
  ctx = offscreenCanvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
  }) as OffscreenCanvasRenderingContext2D;
  
  console.log("Worker: Canvas initialized", { width, height, mobile });
}

// Draw a single frame with all overlays
function drawFrame(
  videoBitmap: ImageBitmap,
  videoW: number,
  videoH: number
): ImageBitmap | null {
  if (!ctx || !offscreenCanvas) return null;

  // 1. Calculate crop for 9:16 aspect ratio
  const targetAspect = 9 / 16;
  const videoAspect = videoW / videoH;

  let sourceW: number, sourceH: number, offsetX: number, offsetY: number;

  if (videoAspect > targetAspect) {
    sourceH = videoH;
    sourceW = videoH * targetAspect;
    offsetX = (videoW - sourceW) / 2;
    offsetY = 0;
  } else {
    sourceW = videoW;
    sourceH = videoW / targetAspect;
    offsetX = 0;
    offsetY = (videoH - sourceH) / 2;
  }

  // 2. Draw Mirrored Video
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(
    videoBitmap,
    offsetX, offsetY, sourceW, sourceH,
    -canvasWidth, 0, canvasWidth, canvasHeight
  );
  ctx.restore();

  // 3. Draw Top Text - Hook text
  ctx.save();
  if (!isMobile) {
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = "white";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 4;
  const topFontSize = isMobile ? 18 : 24;
  ctx.font = `900 ${topFontSize}px Inter, sans-serif`;
  ctx.textAlign = "center";
  const hookText = "Most people fail at Round 3";
  ctx.strokeText(hookText, canvasWidth / 2, 60);
  ctx.fillText(hookText, canvasWidth / 2, 60);
  ctx.restore();

  // 4. Draw Bottom Right Watermark
  ctx.save();
  if (!isMobile) {
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
  }
  const watermarkFontSize = isMobile ? 14 : 18;
  ctx.font = `900 ${watermarkFontSize}px Inter, sans-serif`;
  ctx.textAlign = "right";

  const fingerText = "FINGER";
  const rhythmText = "RHYTHM";
  const comText = ".COM";
  const fingerWidth = ctx.measureText(fingerText).width;
  const rhythmWidth = ctx.measureText(rhythmText).width;
  const comWidth = ctx.measureText(comText).width;

  const totalWatermarkWidth = fingerWidth + rhythmWidth + comWidth;
  const startX = canvasWidth - 20 - totalWatermarkWidth;
  const bottomY = canvasHeight - 20;

  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(fingerText, startX, bottomY);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeText(rhythmText, startX + fingerWidth, bottomY);
  ctx.fillStyle = "#262626";
  ctx.fillText(rhythmText, startX + fingerWidth, bottomY);

  ctx.fillStyle = "#fff";
  ctx.fillText(comText, startX + fingerWidth + rhythmWidth, bottomY);
  ctx.restore();

  // 5. Draw Fail Overlay
  if (failInfo.show) {
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight * 0.35);
    ctx.rotate(-10 * Math.PI / 180);

    if (!isMobile) {
      ctx.shadowColor = "rgba(220, 38, 38, 0.8)";
      ctx.shadowBlur = 40;
    }
    ctx.fillStyle = "#dc2626";
    ctx.font = "900 150px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FAIL", 0, 0);

    const subHeadline = `MADE IT TO ROUND ${failInfo.round}`;
    ctx.font = "900 150px Inter, sans-serif";
    const failWidth = ctx.measureText("FAIL").width;
    const leftEdge = (-failWidth / 2) + 4;

    ctx.font = "900 30px Inter, sans-serif";
    const currentWidth = ctx.measureText(subHeadline).width;
    const subFontSize = Math.floor(30 * (failWidth / currentWidth));

    ctx.font = `900 ${subFontSize}px Inter, sans-serif`;
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.textAlign = "left";
    ctx.fillText(subHeadline, leftEdge, 55);
    ctx.restore();
  }

  // 5.5 Draw Countdown
  const countdownLine = overlayLines.find(line => line.startsWith("COUNTDOWN:"));
  if (countdownLine) {
    const count = countdownLine.split(":")[1];
    ctx.save();
    ctx.font = "900 180px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    if (!isMobile) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 30;
    }
    ctx.fillText(count, canvasWidth / 2, canvasHeight / 2);
    ctx.restore();
  }

  // 6. Draw Game Overlay Text
  if (overlayLines.length > 0) {
    ctx.save();
    if (!isMobile) {
      ctx.shadowColor = "black";
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 4;

    const roundFontSize = isMobile ? 24 : 32;
    const seqFontSize = roundFontSize;
    ctx.textAlign = "center";

    const sequenceLine = overlayLines.find(line =>
      !line.startsWith("ROUND") &&
      !line.startsWith("COUNTDOWN") &&
      /\d/.test(line) &&
      (line.includes(" ") || line.includes("[["))
    );

    const maxWidth = canvasWidth - 40;
    const wrappedSeqLines: string[] = [];

    if (sequenceLine && !failInfo.show) {
      ctx.font = `900 ${seqFontSize}px Inter, sans-serif`;
      const sequenceWithDashes = sequenceLine.replace(/ /g, "-");
      const sequenceItems = sequenceWithDashes.split("-");
      let currentLine = "";

      for (let i = 0; i < sequenceItems.length; i++) {
        const item = sequenceItems[i];
        const separator = i > 0 ? "-" : "";
        const testLine = currentLine ? `${currentLine}${separator}${item}` : item;
        const cleanTest = testLine.replace(/\[\[|\]\]/g, "");
        if (ctx.measureText(cleanTest).width > maxWidth && currentLine) {
          wrappedSeqLines.push(currentLine);
          currentLine = item;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) wrappedSeqLines.push(currentLine);
    }

    const seqLineHeight = seqFontSize * 1.5;
    const totalHeight = wrappedSeqLines.length * seqLineHeight;
    const startY = (canvasHeight - totalHeight) / 2;

    if (wrappedSeqLines.length > 0) {
      ctx.font = `900 ${seqFontSize}px Inter, sans-serif`;
      const seqStartY = startY + seqFontSize / 2;

      wrappedSeqLines.forEach((line, lineIndex) => {
        const y = seqStartY + lineIndex * seqLineHeight;
        const x = canvasWidth / 2;

        if (line.includes("[[") && line.includes("]]")) {
          const segments = line.split(/(\[\[.*?\]\])/g);
          const cleanLine = line.replace(/\[\[|\]\]/g, "");
          const lineWidth = ctx!.measureText(cleanLine).width;
          let currentX = x - lineWidth / 2;

          segments.forEach((segment) => {
            if (!segment) return;
            if (segment.startsWith("[[") && segment.endsWith("]]")) {
              const text = segment.slice(2, -2);
              ctx!.fillStyle = "#FACC15";
              ctx!.fillText(text, currentX + ctx!.measureText(text).width / 2, y);
              currentX += ctx!.measureText(text).width;
            } else {
              ctx!.fillStyle = "white";
              ctx!.fillText(segment, currentX + ctx!.measureText(segment).width / 2, y);
              currentX += ctx!.measureText(segment).width;
            }
          });
        } else {
          ctx!.fillStyle = "white";
          ctx!.fillText(line, x, y);
        }
      });
    }
    ctx.restore();
  }

  // Create and return ImageBitmap from the canvas
  return offscreenCanvas.transferToImageBitmap();
}

// Message handler
self.addEventListener("message", (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case "init":
      initCanvas(payload.width, payload.height, payload.isMobile);
      self.postMessage({ type: "ready" });
      break;

    case "updateOverlay":
      overlayLines = payload.lines || [];
      break;

    case "updateFailInfo":
      failInfo = payload;
      break;

    case "drawFrame":
      const { videoBitmap, videoWidth, videoHeight, frameId } = payload;
      
      const resultBitmap = drawFrame(videoBitmap, videoWidth, videoHeight);
      
      // Close the input bitmap to free memory
      videoBitmap.close();
      
      if (resultBitmap) {
        self.postMessage(
          { type: "frameReady", payload: { bitmap: resultBitmap, frameId } },
          [resultBitmap] // Transfer the bitmap
        );
      }
      break;

    case "terminate":
      offscreenCanvas = null;
      ctx = null;
      break;
  }
});

console.log("VideoRecorder Worker: Loaded");

