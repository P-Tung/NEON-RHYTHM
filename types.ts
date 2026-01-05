/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export enum GameStatus {
  LOADING = "LOADING",
  MENU = "MENU",
  PLAYING = "PLAYING",
  ANALYZING = "ANALYZING",
  RESULT = "RESULT",
  TRANSITION = "TRANSITION",
  ROUND_END = "ROUND_END",
}

export type RobotState = "happy" | "sad" | "analyzing" | "average";

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "NIGHTMARE";

export interface LevelConfig {
  name: string;
  bpm: number;
  length: number;
  color: string;
}

export const DIFFICULTIES: Record<Difficulty, LevelConfig> = {
  EASY: { name: "VIBE CHECK", bpm: 95, length: 8, color: "text-green-500" },
  MEDIUM: {
    name: "IN THE GROOVE",
    bpm: 110,
    length: 8,
    color: "text-white",
  },
  HARD: { name: "HYPER FOCUS", bpm: 130, length: 11, color: "text-white" },
  NIGHTMARE: { name: "VIRTUOSO", bpm: 150, length: 14, color: "text-red-500" },
};

export interface GeminiResponse {
  success: boolean;
  correct_count: number;
  score: number;
  feedback: string;
  detailed_results: boolean[];
  detected_counts: number[];
}

export const COLORS = {
  left: "#ff0000",
  right: "#ffffff",
};
