import React, {useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {usePhotoStore, selectDeleteList} from '../state/photoStore';
import {deletePhotos} from '../services/photoLibrary';
import {colors} from '../theme/colors';
import type {PhotoRecord} from '../types/photo';

export function ConfirmDeleteScreen() {
  const navigation = useNavigation();
  const deleteList = usePhotoStore(selectDeleteList);
  const setUserDecision = usePhotoStore((s) => s.setUserDecision);
  const removePhotos = usePhotoStore((s) => s.removePhotos);
  const [submitting, setSubmitting] = useState(false);

  const rescue = (id: string) => setUserDecision(id, 'keep');

  const confirmDelete = async () => {
    if (deleteList.length === 0) return;
    const ids = deleteList.map((p) => p.id);
    Alert.alert(
      'Delete photos',
      `iOS will ask you to confirm deletion of ${ids.length} ${
        ids.length === 1 ? 'photo' : 'photos'
      }. They will be moved to Recently Deleted.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deletePhotos(ids);
              removePhotos(ids);
              navigation.goBack();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : String(err);
              Alert.alert('Delete failed', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({item}: {item: PhotoRecord}) => (
    <View style={styles.row}>
      <Image source={{uri: item.uri}} style={styles.thumb} />
      <View style={styles.rowBody}>
        <Text style={styles.reason} numberOfLines={2}>
          {item.analysis?.reason ?? 'Marked for deletion by you.'}
        </Text>
        {item.analysis && (
          <Text style={styles.meta}>
            AI: {item.analysis.status} ·{' '}
            {(item.analysis.confidence * 100).toFixed(0)}% confident
          </Text>
        )}
      </View>
      <Pressable style={styles.rescue} onPress={() => rescue(item.id)}>
        <Text style={styles.rescueText}>Rescue</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={deleteList}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No photos are marked for deletion yet.
            </Text>
          </View>
        }
        contentContainerStyle={
          deleteList.length === 0 ? styles.emptyContainer : undefined
        }
      />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {deleteList.length} marked · iOS will ask one more time
        </Text>
        <Pressable
          style={[
            styles.deleteBtn,
            (deleteList.length === 0 || submitting) && styles.deleteBtnDisabled,
          ]}
          disabled={deleteList.length === 0 || submitting}
          onPress={confirmDelete}>
          <Text style={styles.deleteBtnText}>
            {submitting ? 'Deleting…' : 'Delete from camera roll'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  thumb: {width: 64, height: 64, borderRadius: 8, backgroundColor: colors.surface},
  rowBody: {flex: 1},
  reason: {color: colors.text, fontSize: 14},
  meta: {color: colors.textMuted, fontSize: 12, marginTop: 4},
  rescue: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 8,
  },
  rescueText: {color: colors.green, fontWeight: '600'},
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    backgroundColor: colors.surface,
  },
  footerText: {color: colors.textMuted, textAlign: 'center'},
  deleteBtn: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  deleteBtnDisabled: {opacity: 0.4},
  deleteBtnText: {color: '#0E0F12', fontWeight: '700', fontSize: 16},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyContainer: {flexGrow: 1},
  emptyText: {color: colors.textMuted, padding: 24, textAlign: 'center'},
});
