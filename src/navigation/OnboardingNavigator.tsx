import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "../screens/onboarding/WelcomeScreen";
import Walk1 from "../screens/onboarding/Walk1";
import Walk2 from "../screens/onboarding/Walk2";
import Walk3 from "../screens/onboarding/Walk3";

type OnboardingNavigatorProps = {
  onDone?: () => void;
};

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator({
  onDone,
}: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName="WelcomeScreen"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="WelcomeScreen">
        {props => <WelcomeScreen {...(props as any)} onDone={onDone} />}
      </Stack.Screen>

      <Stack.Screen name="Walk1">
        {props => <Walk1 {...(props as any)} onDone={onDone} />}
      </Stack.Screen>

      <Stack.Screen name="Walk2">
        {props => <Walk2 {...(props as any)} onDone={onDone} />}
      </Stack.Screen>

      <Stack.Screen name="Walk3">
        {props => <Walk3 {...(props as any)} onDone={onDone} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}