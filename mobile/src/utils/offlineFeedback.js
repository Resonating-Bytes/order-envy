import { Alert } from 'react-native';
import { isOfflineQueuedResult } from '../lib/offlineWrites';

export function notifyIfOfflineQueued(result, entityLabel = 'Changes') {
    if (!isOfflineQueuedResult(result)) {
        return false;
    }
    Alert.alert(
        'Saved offline',
        `${entityLabel} will sync when you are back online.`,
    );
    return true;
}
