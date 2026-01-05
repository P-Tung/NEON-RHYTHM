# 🛠️ Tech Stack & Gameplay Architecture

### **Core Tech Stack**

- **Framework**: **React 19** (Functional Components + Hooks)
- **Build Tool**: **Vite 6** (Fast ESM-based development)
- **Language**: **TypeScript** (Strong typing for game logic)
- **AI Vision**: **MediaPipe Hands** (Real-time landmarking and finger counting)
- **Styling**: **Vanilla CSS** (Custom dynamic animations)
- **Icons**: **Lucide React**
- **AI Integration**: **Google Generative AI** (@google/genai)

---

### **Gameplay Components (Active Usage)**

#### **1. Logic & State Hooks**

- **`useRhythmEngine.ts`**:
  - Generates **programmatic music** (no large MP3 files).
  - Manages **precision beat timing** via AudioContext.
- **`useHandDetection.ts`**:
  - Processes webcam frames to detect **finger counts**.
  - Uses **MediaPipe** for high-accuracy tracking.
- **`useVideoRecorder.ts`**:
  - Captures gameplay at **20-24 FPS**.
  - Offloads processing to **`videoRecorder.worker.ts`**.

#### **2. UI & Display Layers**

- **`Robot.tsx`**: The **animated character model** (CSS/GIF) reacting to player actions.
- **`BackgroundManager.tsx`**: Manages **webcam textures** and environment effects.
- **`PlayingView.tsx`**: The main **overlay container** during a round.
- **`WebcamPreview.tsx`**: Shows the player with **MediaPipe landmarks** drawn on top.
- **`SequenceDisplay.tsx`**: Visualizes the **rhythm sequence** players must follow.
- **`CountdownOverlay.tsx`**: Handles the **3-2-1 start sequence**.
- **`TransitionOverlay.tsx`**: Displays **"Round Cleared"** or "Round Failed" feedback.

---

### **Gameplay Workflow**

1.  **Initialize**: `App.tsx` loads the **MediaPipe model** and prepares the `AudioContext`.
2.  **Music Sync**: `useRhythmEngine` starts the beat; `App.tsx` generates a **random sequence**.
3.  **Input Loop**: `useHandDetection` reads the webcam; `fingerCountRef` updates every frame.
4.  **Judgement**: At **90% of the beat**, the game compares `fingerCountRef` to the target.
5.  **Recording**: `useVideoRecorder` writes frames + **UI overlays** to a background buffer.
6.  **Resolution**: On fail, `ResultView.tsx` is shown; on success, the next round triggers.
