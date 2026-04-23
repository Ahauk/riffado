import { BottomTabBar, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

import { useTabBarVisibility } from "./TabBarContext";

/**
 * Wraps the default bottom tab bar in an Animated.View so transitions to/from
 * the "immersive" state (e.g. while recording) are smooth instead of flicking
 * when the layout re-flows.
 *
 * The tab bar keeps occupying its slot in the layout; only its visual
 * appearance is animated (opacity + translateY) so nothing underneath jumps.
 */
export function AnimatedTabBar(props: BottomTabBarProps) {
  const { hidden } = useTabBarVisibility();
  const progress = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = hidden

  useEffect(() => {
    Animated.timing(progress, {
      toValue: hidden ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [hidden, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={{ transform: [{ translateY }], opacity }}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
}
