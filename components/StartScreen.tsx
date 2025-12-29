import React, { useState } from "react";
import { DetectionEngine } from "../hooks/useHandDetection";

interface StartScreenProps {
  onStart: () => void;
  isAssetsReady: boolean;
  detectionEngine: DetectionEngine;
  onEngineChange: (engine: DetectionEngine) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  isAssetsReady,
  detectionEngine,
  onEngineChange,
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStart = () => {
    if (!isAssetsReady) return;

    setIsTransitioning(true);
    setTimeout(() => {
      onStart();
    }, 650);
  };

  return (
    <div
      className={`container-viral ${
        isTransitioning
          ? "opacity-0 scale-50 rotate-[10deg] duration-500 ease-in-out"
          : "animate-pop"
      }`}
      style={{
        transition: isTransitioning
          ? "opacity 0.5s ease, transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)"
          : "none",
      }}
    >
      <div className="title-wrapper-viral">
        <h1 className="title-viral">
          <div className="text-content">
            <span className="top">FINGER</span>
            <span className="bottom">RHYTHM</span>
          </div>
        </h1>
        <div className="subtitle-viral">ONLY 1% CAN PASS 💀</div>
      </div>

      {/* Detection Engine Toggle */}
      <div className="mb-6 w-full max-w-xs">
        <div className="text-xs text-gray-400 text-center mb-2 uppercase tracking-wider">
          Detection Engine
        </div>
        <div className="flex rounded-xl overflow-hidden border border-white/20 bg-black/40 backdrop-blur-sm">
          <button
            onClick={() => onEngineChange("mediapipe")}
            className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 ${
              detectionEngine === "mediapipe"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span>MediaPipe</span>
              <span className="text-[10px] opacity-70">
                {detectionEngine === "mediapipe" ? "Active" : "Accurate"}
              </span>
            </div>
          </button>
          <button
            onClick={() => onEngineChange("tensorflow")}
            className={`flex-1 py-3 px-4 text-sm font-bold transition-all duration-200 ${
              detectionEngine === "tensorflow"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span>TensorFlow</span>
              <span className="text-[10px] opacity-70">
                {detectionEngine === "tensorflow" ? "Active" : "Faster"}
              </span>
            </div>
          </button>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!isAssetsReady}
        className="start-btn-viral disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <span>LFG!</span>
        <span className="emoji">🔥</span>
      </button>

      <div className="footer-hint-viral">GET YOUR FINGERS READY 👋</div>
    </div>
  );
};

export default React.memo(StartScreen);
