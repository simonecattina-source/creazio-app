import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";

LogBox.ignoreAllLogs(true);

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: require("../assets/fonts/SpaceGrotesk.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans.ttf"),
    "PlusJakartaSans-Italic": require("../assets/fonts/PlusJakartaSans-Italic.ttf"),
    Ionicons: require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf"),
  });

  // 🔒 Blocco dello zoom su browser mobili (Safari/Chrome per iPhone)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let metaViewport = document.querySelector('meta[name="viewport"]');
      const regoleBloccoZoom = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

      if (metaViewport) {
        metaViewport.setAttribute('content', regoleBloccoZoom);
      } else {
        const nuovoMeta = document.createElement('meta');
        nuovoMeta.name = "viewport";
        nuovoMeta.content = regoleBloccoZoom;
        document.head.appendChild(nuovoMeta);
      }
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
