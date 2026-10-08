import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons";

import { fonts, spacing, radius, useTheme } from "@/src/theme";

export type ToastKind = "success" | "error" | "info";

interface Props {
  message: string | null;
  kind?: ToastKind;
  onHide: () => void;
  bottomOffset: number;
}

export function Toast({ message, kind = "success", onHide, bottomOffset }: Props) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 2600);
    return () => clearTimeout(t);
  }, [message, onHide]);

  if (!message) return null;

  const bg =
    kind === "error" ? colors.error : kind === "info" ? colors.info : colors.success;
  const icon =
    kind === "error" ? "alert-circle" : kind === "info" ? "information-circle" : "checkmark-circle";

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={[styles.wrap, { bottom: bottomOffset }]}
      testID="app-toast"
    >
      <View style={[styles.toast, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={18} color={colors.onSuccess} />
        <Text style={[styles.text, { color: colors.onSuccess }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    maxWidth: 520,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flexShrink: 1, fontFamily: fonts.text, fontSize: 14, fontWeight: "600" },
});
