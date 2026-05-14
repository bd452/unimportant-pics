import { useCallback, useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import type { PermissionResponse } from "expo-media-library";
import { usePhotoStore } from "../state/photoStore";

const PAGE_SIZE = 36;

export function usePhotoLibrary() {
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (after?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const page = await MediaLibrary.getAssetsAsync({
        first: PAGE_SIZE,
        after,
        mediaType: MediaLibrary.MediaType.photo,
        sortBy: [[MediaLibrary.SortBy.creationTime, false]]
      });

      usePhotoStore.getState().ingestAssets(page.assets);
      setEndCursor(page.endCursor);
      setHasNextPage(page.hasNextPage);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load the photo library."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestAccess = useCallback(async () => {
    const response = await MediaLibrary.requestPermissionsAsync(false, [
      "photo"
    ]);
    setPermission(response);
    if (response.granted) {
      await loadPage();
    }
  }, [loadPage]);

  const loadNextPage = useCallback(async () => {
    if (!hasNextPage || isLoading) return;
    await loadPage(endCursor);
  }, [endCursor, hasNextPage, isLoading, loadPage]);

  useEffect(() => {
    let mounted = true;
    MediaLibrary.getPermissionsAsync(false).then((response) => {
      if (!mounted) return;
      setPermission(response);
      if (response.granted) {
        void loadPage();
      }
    });
    return () => {
      mounted = false;
    };
  }, [loadPage]);

  return {
    permission,
    error,
    isLoading,
    hasNextPage,
    requestAccess,
    loadNextPage
  };
}
