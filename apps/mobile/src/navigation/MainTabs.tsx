import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";

import { HomeScreen } from "../features/history/screens/HomeScreen";
import { HistoryListScreen } from "../features/history/screens/HistoryListScreen";
import { LearnScreen } from "../features/learn/screens/LearnScreen";
import { TunerScreen } from "../features/tuner/screens/TunerScreen";
import { colors } from "../theme/tokens";
import { AnimatedTabBar } from "./AnimatedTabBar";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 88,
          paddingTop: 6,
          paddingBottom: 28,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryListScreen}
        options={{
          title: "Historial",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="LearnTab"
        component={LearnScreen}
        options={{
          title: "Aprende",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TunerTab"
        component={TunerScreen}
        options={{
          title: "Afinador",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-note-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
