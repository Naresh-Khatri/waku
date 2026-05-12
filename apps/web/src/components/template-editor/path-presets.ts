/**
 * Small library of path presets surfaced in the insert menu so users don't
 * have to author SVG path-d strings by hand. Each preset has been authored
 * inside a `viewBox`; the node's bbox then scales the path freely.
 */
export interface PathPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  viewBox: [number, number];
  d: string;
}

export const PATH_PRESETS: PathPreset[] = [
  {
    id: "heart",
    label: "Heart",
    width: 200,
    height: 180,
    viewBox: [24, 24],
    d: "M12 21s-7-4.6-9.5-9.2C.9 8.7 2.6 5 6.2 5c2 0 3.5 1.2 4.3 2.6h3C14.3 6.2 15.8 5 17.8 5c3.6 0 5.3 3.7 3.7 6.8C19 16.4 12 21 12 21z",
  },
  {
    id: "star",
    label: "Star",
    width: 200,
    height: 200,
    viewBox: [24, 24],
    d: "M12 2l3 6.9 7.6.7-5.7 5 1.7 7.4L12 18.3 5.4 22l1.7-7.4-5.7-5 7.6-.7L12 2z",
  },
  {
    id: "arrow",
    label: "Arrow",
    width: 220,
    height: 110,
    viewBox: [40, 20],
    d: "M2 10h32M28 4l6 6-6 6",
  },
  {
    id: "blob",
    label: "Blob",
    width: 240,
    height: 220,
    viewBox: [200, 200],
    d: "M40 100c0-40 30-70 70-70s60 30 60 70-30 70-60 70S40 140 40 100z",
  },
  {
    id: "wave",
    label: "Wave",
    width: 320,
    height: 80,
    viewBox: [160, 40],
    d: "M0 20 Q 20 0 40 20 T 80 20 T 120 20 T 160 20",
  },
  {
    id: "checkmark",
    label: "Check",
    width: 160,
    height: 160,
    viewBox: [24, 24],
    d: "M4 12l5 5L20 6",
  },
];

export const DEFAULT_PATH_PRESET = PATH_PRESETS[0]!;
