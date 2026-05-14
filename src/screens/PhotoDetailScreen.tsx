import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRoute, useNavigation, type RouteProp} from '@react-navigation/native';
import {usePhotoStore} from '../state/photoStore';
import {effectiveStatus} from '../types/photo';
import {colors, statusColor} from '../theme/colors';
import {StatusBadge} from '../components/StatusBadge';
import type {RootStackParamList} from '../navigation/types';

export function PhotoDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PhotoDetail'>>();
  const navigation = useNavigation();
  const {photoId} = route.params;
  const photo = usePhotoStore((s) => s.photos[photoId]);
  const setUserDecision = usePhotoStore((s) => s.setUserDecision);

  if (!photo) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Photo not found.</Text>
      </View>
    );
  }

  const status = effectiveStatus(photo);
  const tint = status === 'pending' || status === 'unknown'
    ? statusColor.unknown
    : statusColor[status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{uri: photo.uri}} style={styles.image} resizeMode="contain" />
      <View style={styles.row}>
        <StatusBadge status={status} size={16} />
        <Text style={[styles.status, {color: tint}]}>
          {status === 'pending'
            ? 'Analyzing…'
            : status === 'unknown'
            ? 'Not analyzed yet'
            : status.toUpperCase()}
        </Text>
      </View>
      {photo.analysis && (
        <>
          <Text style={styles.reason}>{photo.analysis.reason}</Text>
          <Text style={styles.meta}>
            Confidence {(photo.analysis.confidence * 100).toFixed(0)}% · priority{' '}
            {photo.analysis.reviewPriority}
          </Text>
          {photo.analysis.signals.length > 0 && (
            <View style={styles.signals}>
              {photo.analysis.signals.map((s) => (
                <Text key={s} style={styles.signal}>
                  {s.replace(/_/g, ' ')}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
      {photo.analysisError && (
        <Text style={styles.error}>Analysis failed: {photo.analysisError}</Text>
      )}
      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, {backgroundColor: colors.green}]}
          onPress={() => {
            setUserDecision(photo.id, 'keep');
            navigation.goBack();
          }}>
          <Text style={styles.btnText}>Keep</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, {backgroundColor: colors.red}]}
          onPress={() => {
            setUserDecision(photo.id, 'delete');
            navigation.goBack();
          }}>
          <Text style={styles.btnText}>Mark delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: 16, gap: 12},
  image: {width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.surface},
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  status: {fontWeight: '700', letterSpacing: 1},
  reason: {color: colors.text, fontSize: 16, lineHeight: 22},
  meta: {color: colors.textMuted, fontSize: 12},
  signals: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  signal: {
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
  },
  error: {color: colors.red},
  actions: {flexDirection: 'row', gap: 12, marginTop: 8},
  btn: {flex: 1, padding: 14, borderRadius: 10, alignItems: 'center'},
  btnText: {color: '#0E0F12', fontWeight: '700'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: colors.textMuted},
});
