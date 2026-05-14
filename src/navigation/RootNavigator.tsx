import React from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {GridScreen} from '../screens/GridScreen';
import {SwipeScreen} from '../screens/SwipeScreen';
import {PhotoDetailScreen} from '../screens/PhotoDetailScreen';
import {ConfirmDeleteScreen} from '../screens/ConfirmDeleteScreen';
import {colors} from '../theme/colors';
import type {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: colors.surface},
          headerTitleStyle: {color: colors.text},
          headerTintColor: colors.primary,
          contentStyle: {backgroundColor: colors.background},
        }}>
        <Stack.Screen
          name="Grid"
          component={GridScreen}
          options={{title: 'Library'}}
        />
        <Stack.Screen
          name="Swipe"
          component={SwipeScreen}
          options={{title: 'Review'}}
        />
        <Stack.Screen
          name="PhotoDetail"
          component={PhotoDetailScreen}
          options={{title: 'Photo'}}
        />
        <Stack.Screen
          name="Confirm"
          component={ConfirmDeleteScreen}
          options={{title: 'Confirm delete'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
