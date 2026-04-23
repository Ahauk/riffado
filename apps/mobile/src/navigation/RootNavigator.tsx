import { NavigationContainer, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AnalyzingScreen } from "../features/analysis/screens/AnalyzingScreen";
import { ResultsScreen } from "../features/analysis/screens/ResultsScreen";
import { ChordDetailScreen } from "../features/chords/screens/ChordDetailScreen";
import { SettingsScreen } from "../features/settings/screens/SettingsScreen";
import { SplashScreen } from "../features/splash/screens/SplashScreen";
import { colors } from "../theme/tokens";
import { MainTabs } from "./MainTabs";
import { TabBarProvider } from "./TabBarContext";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" },
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <TabBarProvider>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="ChordDetail" component={ChordDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </TabBarProvider>
    </NavigationContainer>
  );
}
