import {
  BebasNeue_400Regular,
  useFonts,
} from "@expo-google-fonts/bebas-neue";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NotationProvider } from "./src/features/settings/NotationContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  if (!fontsLoaded) {
    // Native splash stays on-screen until we return content.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NotationProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </NotationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
