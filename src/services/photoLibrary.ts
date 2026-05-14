import {Platform, Alert, Linking} from 'react-native';
import {
  CameraRoll,
  type PhotoIdentifier,
} from '@react-native-camera-roll/camera-roll';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type PermissionStatus,
} from 'react-native-permissions';

const IOS_PHOTOS_PERMISSION = PERMISSIONS.IOS.PHOTO_LIBRARY;
const IOS_PHOTOS_ADD_PERMISSION = PERMISSIONS.IOS.PHOTO_LIBRARY_ADD_ONLY;

export type PhotoPermissionState =
  | 'granted'
  | 'limited'
  | 'denied'
  | 'blocked'
  | 'unavailable';

function mapStatus(status: PermissionStatus): PhotoPermissionState {
  switch (status) {
    case RESULTS.GRANTED:
      return 'granted';
    case RESULTS.LIMITED:
      return 'limited';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    default:
      return 'unavailable';
  }
}

export async function checkPhotoPermission(): Promise<PhotoPermissionState> {
  if (Platform.OS !== 'ios') return 'unavailable';
  return mapStatus(await check(IOS_PHOTOS_PERMISSION));
}

export async function requestPhotoPermission(): Promise<PhotoPermissionState> {
  if (Platform.OS !== 'ios') return 'unavailable';
  return mapStatus(await request(IOS_PHOTOS_PERMISSION));
}

export function openSettingsForPermission() {
  Alert.alert(
    'Photo access needed',
    'Enable photo access in Settings so Unimportant Pics can review your library.',
    [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Open Settings', onPress: () => Linking.openSettings()},
    ],
  );
}

export interface LoadedPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  createdAt: number;
}

export interface LoadPage {
  photos: LoadedPhoto[];
  endCursor?: string;
  hasNextPage: boolean;
}

export async function loadPhotosPage(opts: {
  first: number;
  after?: string;
}): Promise<LoadPage> {
  const res = await CameraRoll.getPhotos({
    first: opts.first,
    after: opts.after,
    assetType: 'Photos',
    include: ['filename', 'imageSize', 'playableDuration'],
  });

  const photos: LoadedPhoto[] = res.edges.map((edge: PhotoIdentifier) => ({
    id: edge.node.image.uri,
    uri: edge.node.image.uri,
    width: edge.node.image.width ?? 0,
    height: edge.node.image.height ?? 0,
    createdAt: (edge.node.timestamp ?? 0) * 1000,
  }));

  return {
    photos,
    endCursor: res.page_info.end_cursor,
    hasNextPage: res.page_info.has_next_page,
  };
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  // iOS will show its own confirmation alert; user must accept.
  await CameraRoll.deletePhotos(ids);
}

export {IOS_PHOTOS_PERMISSION, IOS_PHOTOS_ADD_PERMISSION};
