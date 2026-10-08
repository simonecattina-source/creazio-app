import { Platform } from "react-native";

// iOS 26+ gets native liquid-glass tabs; everything else (older iOS, web) uses
// the classic JS <Tabs> bar. Defined once, imported by the layout and screens.
export const usesNativeTabs =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
