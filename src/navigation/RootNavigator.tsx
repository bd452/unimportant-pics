import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { usePhotoLibrary } from "../hooks/usePhotoLibrary";
import { PermissionScreen } from "../screens/PermissionScreen";
import { GridScreen } from "../screens/GridScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { PhotoDetailScreen } from "../screens/PhotoDetailScreen";
import { ConfirmDeleteScreen } from "../screens/ConfirmDeleteScreen";
import { colors } from "../styles/theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary
  }
};

export function RootNavigator() {
  const library = usePhotoLibrary();
  const granted = library.permission?.granted ?? false;

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        {granted ? (
          <>
            <Stack.Screen
              name="Grid"
              options={{ title: "Library" }}
            >
              {(props) => (
                <GridScreen
                  {...props}
                  isLoading={library.isLoading}
                  hasNextPage={library.hasNextPage}
                  error={library.error}
                  onLoadMore={library.loadNextPage}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Swipe"
              component={SwipeScreen}
              options={{ title: "Swipe review" }}
            />
            <Stack.Screen
              name="PhotoDetail"
              component={PhotoDetailScreen}
              options={{ presentation: "modal", title: "Photo" }}
            />
            <Stack.Screen
              name="ConfirmDelete"
              component={ConfirmDeleteScreen}
              options={{ title: "Confirm delete" }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Permission"
            options={{ headerShown: false }}
          >
            {() => (
              <PermissionScreen
                permission={library.permission}
                onRequestAccess={library.requestAccess}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
