import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  checkPhotoPermission,
  openSettingsForPermission,
  requestPhotoPermission,
  type PhotoPermissionState,
} from '../services/photoLibrary';
import {colors} from '../theme/colors';

interface Props {
  onGranted: () => void;
}

export function PermissionScreen({onGranted}: Props) {
  const [state, setState] = useState<PhotoPermissionState>('denied');

  useEffect(() => {
    checkPhotoPermission().then(setState);
  }, []);

  useEffect(() => {
    if (state === 'granted' || state === 'limited') onGranted();
  }, [state, onGranted]);

  const ask = useCallback(async () => {
    const next = await requestPhotoPermission();
    setState(next);
    if (next === 'blocked') openSettingsForPermission();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo library access</Text>
      <Text style={styles.body}>
        Unimportant Pics reviews your camera roll with AI to suggest which
        photos are safe to delete. Your library never leaves the device without
        your consent — photos are sent only when you start a review session,
        and decisions are yours to confirm.
      </Text>
      <Pressable style={styles.button} onPress={ask}>
        <Text style={styles.buttonText}>
          {state === 'blocked' ? 'Open Settings' : 'Allow photo access'}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        We recommend selecting <Text style={styles.bold}>All Photos</Text> so
        review and deletion can apply to the full library. Limited Selection
        also works.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    gap: 16,
  },
  title: {color: colors.text, fontSize: 24, fontWeight: '700'},
  body: {color: colors.textMuted, lineHeight: 22, fontSize: 15},
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {color: '#0E0F12', fontWeight: '700', fontSize: 16},
  hint: {color: colors.textMuted, fontSize: 13, lineHeight: 18},
  bold: {color: colors.text, fontWeight: '700'},
});
