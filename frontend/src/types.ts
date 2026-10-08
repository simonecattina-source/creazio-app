// Core data model for GlicoTrack (local-only, single user).

export type MealKey = "colazione" | "pranzo" | "merenda" | "cena" | "notte";
export type Phase = "prima" | "dopo";

export type MomentKey =
  | "prima_colazione"
  | "dopo_colazione"
  | "prima_pranzo"
  | "dopo_pranzo"
  | "prima_merenda"
  | "dopo_merenda"
  | "prima_cena"
  | "dopo_cena"
  | "notte";

export interface MomentDef {
  key: MomentKey;
  label: string;
  meal: MealKey;
  phase: Phase | null;
  icon: string; // Ionicons name
}

// Ordered list of the 9 available moments.
export const MOMENTS: MomentDef[] = [
  { key: "prima_colazione", label: "Prima Colazione", meal: "colazione", phase: "prima", icon: "cafe-outline" },
  { key: "dopo_colazione", label: "Dopo Colazione", meal: "colazione", phase: "dopo", icon: "cafe" },
  { key: "prima_pranzo", label: "Prima Pranzo", meal: "pranzo", phase: "prima", icon: "restaurant-outline" },
  { key: "dopo_pranzo", label: "Dopo Pranzo", meal: "pranzo", phase: "dopo", icon: "restaurant" },
  { key: "prima_merenda", label: "Prima Merenda", meal: "merenda", phase: "prima", icon: "nutrition-outline" },
  { key: "dopo_merenda", label: "Dopo Merenda", meal: "merenda", phase: "dopo", icon: "nutrition" },
  { key: "prima_cena", label: "Prima Cena", meal: "cena", phase: "prima", icon: "fast-food-outline" },
  { key: "dopo_cena", label: "Dopo Cena", meal: "cena", phase: "dopo", icon: "fast-food" },
  { key: "notte", label: "Notte", meal: "notte", phase: null, icon: "moon-outline" },
];

export const MOMENT_BY_KEY: Record<MomentKey, MomentDef> = MOMENTS.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<MomentKey, MomentDef>,
);

export interface Measurement {
  id: string;
  dateISO: string; // full ISO datetime of the measurement
  glucose: number; // mg/dL
  insulin: number | null; // insulin units (UI), optional
  moment: MomentKey;
  note: string | null; // optional food note
}

// Standard glucose thresholds (mg/dL).
export const GLUCOSE_LOW = 70;
export const GLUCOSE_HIGH = 180;

export type GlucoseStatus = "low" | "normal" | "high";

export function glucoseStatus(value: number): GlucoseStatus {
  if (value < GLUCOSE_LOW) return "low";
  if (value > GLUCOSE_HIGH) return "high";
  return "normal";
}
