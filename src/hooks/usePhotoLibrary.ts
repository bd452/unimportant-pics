import { useCallback, useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";
import type { Asset, PermissionResponse } from "expo-media-library";

const PAGE_SIZE = 36;

export function usePhotoLibrary() {
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (after?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after,
          mediaType: MediaLibrary.MediaType.photo,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]]
        });

        setAssets((current) => {
          const seen = new Set(current.map((asset) => asset.id));
          const incoming = page.assets.filter((asset) => !seen.has(asset.id));
          return after ? [...current, ...incoming] : incoming;
        });
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
    },
    []
  );

  const requestAccess = useCallback(async () => {
    const response = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
    setPermission(response);

    if (response.granted) {
      await loadPage();
    }
  }, [loadPage]);

  const loadNextPage = useCallback(async () => {
    if (!hasNextPage || isLoading) {
      return;
    }

    await loadPage(endCursor);
  }, [endCursor, hasNextPage, isLoading, loadPage]);

  const removeAssets = useCallback((ids: string[]) => {
    const deleteSet = new Set(ids);
    setAssets((current) => current.filter((asset) => !deleteSet.has(asset.id)));
  }, []);

  useEffect(() => {
    let isMounted = true;

    MediaLibrary.getPermissionsAsync(false).then((response) => {
      if (!isMounted) {
        return;
      }

      setPermission(response);

      if (response.granted) {
        void loadPage();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadPage]);

  return {
    assets,
    error,
    hasNextPage,
    isLoading,
    permission,
    loadNextPage,
    removeAssets,
    requestAccess
  };
}
