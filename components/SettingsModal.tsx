import React from "react";
import { X, Settings } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showFingerVector: boolean;
  setShowFingerVector: (show: boolean) => void;
  judgementMode: "LOCAL" | "AI";
  setJudgementMode: (mode: "LOCAL" | "AI") => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showFingerVector,
  setShowFingerVector,
  judgementMode,
  setJudgementMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in duration-200">
      <div
        className="glass-panel p-6 md:p-8 rounded-3xl max-w-sm w-full animate-pop shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Settings className="text-[#00f3ff]" size={24} />
            <h2 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] to-[#ff00ff]">
              SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/50 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Hand Skeleton Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-widest text-white/80 group-hover:text-white transition-colors">
                HAND SKELETON
              </span>
              <span className="text-[10px] text-white/40 uppercase font-bold">
                Visualize finger tracking
              </span>
            </div>
            <button
              onClick={() => setShowFingerVector(!showFingerVector)}
              className={`w-14 h-7 rounded-full transition-all relative flex items-center px-1 ${
                showFingerVector
                  ? "bg-[#00f3ff]/20 border border-[#00f3ff]/50"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full transition-all shadow-lg ${
                  showFingerVector
                    ? "translate-x-7 bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]"
                    : "translate-x-0 bg-white/20"
                }`}
              />
            </button>
          </div>

          {/* Judgement Mode Toggle */}
          <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
            <span className="text-sm font-black tracking-widest text-white/80">
              JUDGEMENT MODE
            </span>
            <div className="flex bg-black/40 p-1 rounded-full border border-white/10 w-full">
              <button
                onClick={() => setJudgementMode("LOCAL")}
                className={`flex-1 py-2 px-4 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
                  judgementMode === "LOCAL"
                    ? "bg-white/10 text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                Local
              </button>
              <button
                onClick={() => setJudgementMode("AI")}
                className={`flex-1 py-2 px-4 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${
                  judgementMode === "AI"
                    ? "bg-white/10 text-[#ff00ff] shadow-[0_0_15px_rgba(255,0,255,0.2)]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                AI Judge
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[9px] text-white/20 uppercase font-bold tracking-[0.2em] text-center">
              v1.0.0 • NEON RHYTHM ENGINE
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
