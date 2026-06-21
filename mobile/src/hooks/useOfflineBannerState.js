import { useNetwork } from '../context/NetworkContext';

export const OFFLINE_BANNER_HEIGHT = 44;

/** Whether the offline/sync strip should show below the screen header. */
export function useOfflineBannerVisible() {
    const { isOnline, pendingCount } = useNetwork();
    return !isOnline || pendingCount > 0;
}

export function useOfflineBannerHeight() {
    const visible = useOfflineBannerVisible();
    return visible ? OFFLINE_BANNER_HEIGHT : 0;
}
