import { create } from "zustand";

/**
 * Cross-canvas channel for the moon ↔ jaw "lunge bite" interaction.
 *
 * GlobeScene's <Canvas> and LangPortalToggle's <Canvas> are independent
 * WebGL contexts with their own cameras, so they cannot share THREE.Vector3
 * world coords directly. Moon.tsx projects its world position through the
 * globe camera, converts to viewport pixel coordinates, and writes here.
 * TeethJawR3F reads this on every frame, compares against its own DOM
 * container rect, and triggers a lunge-bite when the moon is close enough.
 */
/** Mirrors Moon.tsx's internal MoonState — exposed so the jaw can branch logic. */
export type MoonExternalState = "orbiting" | "grabbed" | "returning" | "unknown";

interface JawMoonState {
  /** Moon centre in viewport pixel coords (px from top-left). NaN = unknown. */
  moonScreenX: number;
  moonScreenY: number;
  /** Whether the moon is auto-orbiting, being dragged, or springing home. */
  moonState: MoonExternalState;
  /** Monotonic counter — increments whenever the moon's position is updated. */
  tick: number;
  setMoonFrame: (x: number, y: number, state: MoonExternalState) => void;
}

export const useJawMoonStore = create<JawMoonState>((set) => ({
  moonScreenX: Number.NaN,
  moonScreenY: Number.NaN,
  moonState: "unknown",
  tick: 0,
  setMoonFrame: (x, y, state) =>
    set((s) => ({
      moonScreenX: x,
      moonScreenY: y,
      moonState: state,
      tick: s.tick + 1,
    })),
}));
