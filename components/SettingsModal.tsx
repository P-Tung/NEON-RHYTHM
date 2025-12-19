import React from "react";
import { X, Settings } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showFingerVector: boolean;
  setShowFingerVector: (show: boolean) => void;
  judgementMode: "LOCAL" | "AI";
  setJudgementMode: (mode: "LOCAL" | "AI") => void;
  videoOpacity: number;
  setVideoOpacity: (opacity: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showFingerVector,
  setShowFingerVector,
  judgementMode,
  setJudgementMode,
  videoOpacity,
  setVideoOpacity,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in duration-200">
      <div
        className="bg-black p-6 md:p-8 rounded-3xl max-w-sm w-full animate-pop shadow-2xl border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Settings className="text-white" size={24} />
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/50 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Video Opacity Slider */}
          <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black tracking-widest text-white/90">
                VIDEO OPACITY
              </span>
              <span className="text-[10px] font-mono text-white/60">
                {Math.round(videoOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.01"
              value={videoOpacity}
              onChange={(e) => setVideoOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Hand Skeleton Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-white/90">
                GHOST SKELETON
              </span>
              <span className="text-[10px] text-white/40 uppercase font-bold">
                Overlay hand landmarks
              </span>
            </div>
            <button
              onClick={() => setShowFingerVector(!showFingerVector)}
              className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 ${
                showFingerVector
                  ? "bg-white"
                  : "bg-white/10 border border-white/10"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full transition-all ${
                  showFingerVector
                    ? "translate-x-6 bg-black"
                    : "translate-x-0 bg-white/40"
                }`}
              />
            </button>
          </div>

          {/* Judgement Mode Toggle */}
          <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-xs font-black tracking-widest text-white/90">
              ENGINE MODE
            </span>
            <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 w-full">
              <button
                onClick={() => setJudgementMode("LOCAL")}
                className={`flex-1 py-2 px-4 rounded md text-[10px] font-black tracking-widest uppercase transition-all ${
                  judgementMode === "LOCAL"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                Local
              </button>
              <button
                onClick={() => setJudgementMode("AI")}
                className={`flex-1 py-2 px-4 rounded md text-[10px] font-black tracking-widest uppercase transition-all ${
                  judgementMode === "AI"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                AI Judge
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] text-center">
              SYSTEM v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
