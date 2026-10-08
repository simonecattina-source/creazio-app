// Design tokens for GlicoTrack. Light + Dark themes (values from
// /app/design_guidelines.json). Keys match the "color" block of that file.
//
// Usage:
//   const useStyles = makeStyles((colors) => ({ card: { backgroundColor: colors.surfaceSecondary } }));
//   const { colors } = useTheme();  // for non-style color props (icons etc.)

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#1C1C1E",
  surfaceSecondary: "#F2F2F7",
  onSurfaceSecondary: "#1C1C1E",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#1C1C1E",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8E8E93",

  brand: "#0A66C2",
  onBrand: "#FFFFFF",
  brandPrimary: "#0A66C2",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E6F0FA",
  onBrandSecondary: "#0A66C2",
  brandTertiary: "#F0F5FA",
  onBrandTertiary: "#0A66C2",

  success: "#34C759",
  onSuccess: "#FFFFFF",
  warning: "#FF9F0A",
  onWarning: "#FFFFFF",
  error: "#FF3B30",
  onError: "#FFFFFF",
  info: "#007AFF",
  onInfo: "#FFFFFF",

  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#E5E5EA",
};

const dark: typeof light = {
  surface: "#000000",
  onSurface: "#F2F2F7",
  surfaceSecondary: "#1C1C1E",
  onSurfaceSecondary: "#E5E5EA",
  surfaceTertiary: "#2C2C2E",
  onSurfaceTertiary: "#E5E5EA",
  surfaceInverse: "#F2F2F7",
  onSurfaceInverse: "#000000",
  muted: "#8E8E93",

  brand: "#0A84FF",
  onBrand: "#FFFFFF",
  brandPrimary: "#0A84FF",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#1A3A5A",
  onBrandSecondary: "#66B2FF",
  brandTertiary: "#112233",
  onBrandTertiary: "#66B2FF",

  success: "#30D158",
  onSuccess: "#FFFFFF",
  warning: "#FF9F0A",
  onWarning: "#FFFFFF",
  error: "#FF453A",
  onError: "#FFFFFF",
  info: "#0A84FF",
  onInfo: "#FFFFFF",

  border: "#38383A",
  borderStrong: "#48484A",
  divider: "#38383A",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  display: "SpaceGrotesk",
  text: "PlusJakartaSans",
  textItalic: "PlusJakartaSans-Italic",
} as const;
