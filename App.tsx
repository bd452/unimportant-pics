import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {RootNavigator} from './src/navigation/RootNavigator';
import {PermissionScreen} from './src/screens/PermissionScreen';
import {checkPhotoPermission} from './src/services/photoLibrary';
import {configureAIClient} from './src/services/aiClient';
import {config} from './src/config';
import {colors} from './src/theme/colors';

export default function App() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    configureAIClient({baseUrl: config.apiBaseUrl});
  }, []);

  useEffect(() => {
    checkPhotoPermission().then((p) => {
      if (p === 'granted' || p === 'limited') setGranted(true);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1, backgroundColor: colors.background}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        {granted ? (
          <RootNavigator />
        ) : (
          <PermissionScreen onGranted={() => setGranted(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
