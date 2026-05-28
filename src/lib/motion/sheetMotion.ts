export const SHEET_DRAG_CLOSE_OFFSET = 80;
export const SHEET_DRAG_CLOSE_VELOCITY = 650;

export const SHEET_ENTER_TRANSITION = {
  type: "spring",
  stiffness: 320,
  damping: 34,
} as const;

export const SHEET_EXIT_TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0, 1, 1],
} as const;

export const SHEET_BACKDROP_TRANSITION = {
  duration: 0.18,
  ease: "easeOut",
} as const;

export const VIEW_MODE_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1],
} as const;

export const SHEET_MOTION = {
  initial: { y: "100%", opacity: 0.92 },
  animate: {
    y: 0,
    opacity: 1,
    transition: SHEET_ENTER_TRANSITION,
  },
  exit: {
    y: "100%",
    opacity: 0.92,
    transition: SHEET_EXIT_TRANSITION,
  },
} as const;

export const REDUCED_SHEET_MOTION = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.12 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
} as const;

