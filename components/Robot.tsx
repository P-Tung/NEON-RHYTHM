/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { RobotState } from "../types";

interface RobotProps {
  state: RobotState;
}

const Robot: React.FC<RobotProps> = ({ state }) => {
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    const getGifPath = () => {
      switch (state) {
        case "happy":
          return "/win.gif";
        case "sad":
          return "/lose.gif";
        case "analyzing":
        case "average":
        default:
          return "/judging.gif";
      }
    };

    return (
      <div className="relative group">
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
          <img
            src={getGifPath()}
            alt={`${state} state`}
            className="w-full h-full object-contain rounded-3xl"
          />
        </div>
      </div>
    );
  }

  const themeClass = `${state}-theme`;

  // Pre-generate particles for happy state to avoid unnecessary re-computations
  const particles = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      type: i % 2 === 0 ? "star" : "heart",
      tx: `${(Math.random() - 0.5) * 200}px`,
      ty: `${-(Math.random() * 150 + 50)}px`,
      r: `${Math.random() * 360}deg`,
      s: Math.random() * 1 + 0.5,
      delay: `${Math.random() * 0.5}s`,
    }));
  }, []);

  return (
    <div className={`robot-wrapper active ${themeClass}`}>
      <div className="robot-head">
        <div className="antenna-stem">
          <div className="antenna-bulb"></div>
        </div>
        <div className="face-screen">
          {state === "analyzing" && <div className="scan-line"></div>}

          <div className="eyes-container">
            <div className="eye left"></div>
            <div className="eye right"></div>

            {state === "sad" && (
              <>
                <div className="tear stream-1"></div>
                <div className="tear stream-2"></div>
                <div className="tear stream-3"></div>
                <div className="tear stream-4"></div>
              </>
            )}
          </div>

          <div className="mouth"></div>

          {(state === "happy" || state === "analyzing") && (
            <>
              <div className="cheek left"></div>
              <div className="cheek right"></div>
            </>
          )}

          {state === "analyzing" && (
            <>
              <div className="gear gear-1"></div>
              <div className="gear gear-2"></div>
            </>
          )}
        </div>
      </div>

      {state === "sad" && (
        <div className="puddle-container">
          <div className="puddle"></div>
          <div className="splash s1"></div>
          <div className="splash s2"></div>
          <div className="splash s3"></div>
        </div>
      )}

      {state === "happy" && (
        <div className="particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className={`particle p${p.id + 1} ${p.type}`}
              style={{
                // @ts-ignore
                "--tx": p.tx,
                "--ty": p.ty,
                "--r": p.r,
                "--s": p.s,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {state === "analyzing" && (
        <>
          <div className="confetti c1"></div>
          <div className="confetti c2"></div>
          <div className="confetti c3"></div>
          <div className="confetti c4"></div>
        </>
      )}
    </div>
  );
};

export default React.memo(Robot);
