import { Asset } from 'expo-asset';
import { RATING_IMAGE_SOURCES } from '../utils/ratings';

let loadPromise = null;
/** @type {Record<number, string> | null} */
let urisByRating = null;

/**
 * Copy bundled rating PNGs into the device cache so Image works offline in Expo Go.
 * In dev, plain require() resolves to Metro HTTP URLs that fail without Wi‑Fi.
 */
export function ensureRatingAssetsLoaded() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        const entries = await Promise.all(
            Object.entries(RATING_IMAGE_SOURCES).map(async ([value, moduleId]) => {
                const asset = Asset.fromModule(moduleId);
                await asset.downloadAsync();
                return [Number(value), asset.localUri || asset.uri];
            }),
        );
        urisByRating = Object.fromEntries(entries);
        return urisByRating;
    })();

    return loadPromise;
}

export function getRatingImageUri(rating) {
    const rounded = Math.round(Number(rating));
    if (!urisByRating) return null;
    return urisByRating[rounded] || urisByRating[3] || null;
}

export function areRatingAssetsReady() {
    return Boolean(urisByRating);
}

export function resetRatingAssetsForTests() {
    loadPromise = null;
    urisByRating = null;
}
