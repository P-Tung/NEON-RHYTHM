import React from "react";

interface FingerCountDisplayProps {
  fingerCount: number;
}

const FingerCountDisplay: React.FC<FingerCountDisplayProps> = ({ fingerCount }) => {
  return (
    <div className="absolute top-6 left-6 z-50 pointer-events-none flex flex-col items-start leading-none">
      <div className="text-[10px] md:text-xs font-black text-white/50 uppercase tracking-[0.2em] mb-1 drop-shadow-sm">
        finger count
      </div>
      <div className="text-4xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_4px_4px_rgba(0,0,0,1.0)]">
        {fingerCount}
      </div>
    </div>
  );
};

export default React.memo(FingerCountDisplay);

