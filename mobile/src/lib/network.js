import NetInfo from '@react-native-community/netinfo';

let isOnline = true;
const listeners = new Set();

function notify() {
    listeners.forEach((listener) => {
        listener(isOnline);
    });
}

export function getIsOnline() {
    return isOnline;
}

export function subscribeOnlineStatus(listener) {
    listeners.add(listener);
    listener(isOnline);
    return () => listeners.delete(listener);
}

function computeIsOnline(state) {
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
}

export async function initNetworkStatus() {
    const state = await NetInfo.fetch();
    isOnline = computeIsOnline(state);
    notify();

    NetInfo.addEventListener((nextState) => {
        const nextOnline = computeIsOnline(nextState);
        if (nextOnline === isOnline) return;
        isOnline = nextOnline;
        notify();
    });
}
