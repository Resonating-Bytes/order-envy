import {
    addOutboxItem,
    getLocalEntity,
    getOutbox,
    getIdMap,
    patchRestaurantListCache,
    removeLocalEntity,
    removeOutboxItem,
    setIdMapEntry,
    setLocalEntity,
    updateOutboxItem,
} from '../storage/offlineStore';
import { createLocalId, isLocalId, remapBody, remapId, remapPath } from './offlineIds';
import { getIsOnline } from './network';
import { assertRemoteWriteAllowed } from './compatibility';

export class OfflineQueuedError extends Error {
    constructor(message, extras = {}) {
        super(message);
        this.name = 'OfflineQueuedError';
        Object.assign(this, extras);
    }
}

function buildLocalRestaurant(body, localId) {
    return {
        _id: localId,
        name: body.name,
        description: body.description || '',
        website: body.website || '',
        phone: body.phone || '',
        location: {
            address: body.address || '',
            lat: body.lat,
            long: body.long,
        },
        menuItems: [],
        ratings: [],
        userAverageRating: null,
        _pendingSync: true,
    };
}

function buildLocalMenuItem(body, localId, restaurantId) {
    return {
        _id: localId,
        name: body.name,
        category: body.category,
        description: body.description || '',
        restaurant: restaurantId,
        ratings: [],
        _pendingSync: true,
    };
}

async function queueItem(item) {
    await addOutboxItem({
        id: createLocalId(),
        createdAt: Date.now(),
        ...item,
    });
}

const MENU_CATEGORIES = [
    'Appetizer',
    'Side',
    'Entree',
    'Dessert',
    'Beverage',
    'Other',
];

function groupMenuByCategory(menuItems = []) {
    return MENU_CATEGORIES.map((label) => ({
        label,
        menuItems: menuItems.filter((item) => item.category === label),
    })).filter((group) => group.menuItems.length > 0);
}

export async function getLocalRestaurantResponse(restaurantId) {
    const local = await getLocalEntity('restaurants', restaurantId);
    if (!local) return null;
    return {
        restaurant: local,
        menuByCategory: groupMenuByCategory(local.menuItems || []),
    };
}

export async function getLocalMenuItemResponse(menuItemId) {
    const local = await getLocalEntity('menuItems', menuItemId);
    if (!local) return null;
    return { menuItem: local };
}

export async function handleOfflineWrite(path, method, bodyText) {
    const body = bodyText ? JSON.parse(bodyText) : undefined;

    if (method === 'POST' && path === '/restaurants') {
        const localId = createLocalId();
        const restaurant = buildLocalRestaurant(body, localId);
        await setLocalEntity('restaurants', localId, restaurant);
        await queueItem({
            method: 'POST',
            path: '/restaurants',
            body,
            localEntityId: localId,
            localEntityType: 'restaurants',
        });
        await patchRestaurantListCache((data) => ({
            ...data,
            restaurants: [restaurant, ...(data.restaurants || [])],
        }));
        return { restaurant, offlineQueued: true };
    }

    const restaurantUpdateMatch = path.match(/^\/restaurants\/([^/]+)$/);
    if (method === 'PUT' && restaurantUpdateMatch) {
        const restaurantId = restaurantUpdateMatch[1];
        const existing = isLocalId(restaurantId)
            ? await getLocalEntity('restaurants', restaurantId)
            : null;
        const updated = buildLocalRestaurant(body, restaurantId);
        updated.menuItems = existing?.menuItems || [];
        updated.ratings = existing?.ratings || [];
        updated._pendingSync = true;
        if (isLocalId(restaurantId)) {
            await setLocalEntity('restaurants', restaurantId, updated);
        }
        await queueItem({
            method: 'PUT',
            path,
            body,
            localEntityId: isLocalId(restaurantId) ? restaurantId : undefined,
            localEntityType: isLocalId(restaurantId) ? 'restaurants' : undefined,
        });
        await patchRestaurantListCache((data) => ({
            ...data,
            restaurants: (data.restaurants || []).map((item) => (
                String(item._id) === String(restaurantId)
                    ? { ...item, ...updated }
                    : item
            )),
        }));
        return { restaurant: updated, offlineQueued: true };
    }

    if (method === 'DELETE' && restaurantUpdateMatch) {
        const restaurantId = restaurantUpdateMatch[1];
        if (isLocalId(restaurantId)) {
            await removeLocalEntity('restaurants', restaurantId);
        }
        await queueItem({ method: 'DELETE', path });
        await patchRestaurantListCache((data) => ({
            ...data,
            restaurants: (data.restaurants || []).filter(
                (item) => String(item._id) !== String(restaurantId)
            ),
        }));
        return { ok: true, offlineQueued: true };
    }

    const menuCreateMatch = path.match(/^\/restaurants\/([^/]+)\/menu-items$/);
    if (method === 'POST' && menuCreateMatch) {
        const restaurantId = menuCreateMatch[1];
        const localId = createLocalId();
        const menuItem = buildLocalMenuItem(body, localId, restaurantId);
        await setLocalEntity('menuItems', localId, menuItem);
        await queueItem({
            method: 'POST',
            path,
            body,
            localEntityId: localId,
            localEntityType: 'menuItems',
        });
        if (isLocalId(restaurantId)) {
            const restaurant = await getLocalEntity('restaurants', restaurantId);
            if (restaurant) {
                restaurant.menuItems = [...(restaurant.menuItems || []), menuItem];
                await setLocalEntity('restaurants', restaurantId, restaurant);
            }
        }
        return { menuItem, offlineQueued: true };
    }

    const menuItemMatch = path.match(/^\/restaurants\/([^/]+)\/menu-items\/([^/]+)$/);
    if (menuItemMatch) {
        const [, restaurantId, menuItemId] = menuItemMatch;
        if (method === 'PUT') {
            const menuItem = buildLocalMenuItem(body, menuItemId, restaurantId);
            if (isLocalId(menuItemId)) {
                await setLocalEntity('menuItems', menuItemId, menuItem);
            }
            await queueItem({
                method: 'PUT',
                path,
                body,
                localEntityId: isLocalId(menuItemId) ? menuItemId : undefined,
                localEntityType: isLocalId(menuItemId) ? 'menuItems' : undefined,
            });
            return { menuItem, offlineQueued: true };
        }
        if (method === 'DELETE') {
            if (isLocalId(menuItemId)) {
                await removeLocalEntity('menuItems', menuItemId);
            }
            await queueItem({ method: 'DELETE', path });
            return { ok: true, offlineQueued: true };
        }
    }

    const checkinMatch = path.match(/^\/restaurants\/([^/]+)\/checkin$/);
    if (method === 'POST' && checkinMatch) {
        await queueItem({ method: 'POST', path, body });
        return { ok: true, offlineQueued: true };
    }

    if (method === 'POST' && path === '/recommendations') {
        await queueItem({ method: 'POST', path, body });
        return { ok: true, offlineQueued: true };
    }

    const recommendationDeleteMatch = path.match(/^\/recommendations\/([^/]+)$/);
    if (method === 'DELETE' && recommendationDeleteMatch) {
        await queueItem({ method: 'DELETE', path });
        return { ok: true, offlineQueued: true };
    }

    throw new OfflineQueuedError('This action is not available offline yet.');
}

function extractServerId(data, item) {
    if (item.localEntityType === 'restaurants') {
        return data?.restaurant?._id;
    }
    if (item.localEntityType === 'menuItems') {
        return data?.menuItem?._id;
    }
    return null;
}

async function applyIdRemap(item, serverId, sessionIdMap) {
    if (!item.localEntityId || !serverId) return;
    sessionIdMap[item.localEntityId] = String(serverId);
    await setIdMapEntry(item.localEntityId, String(serverId));
    if (item.localEntityType === 'restaurants') {
        const local = await getLocalEntity('restaurants', item.localEntityId);
        if (local) {
            await removeLocalEntity('restaurants', item.localEntityId);
        }
    }
    if (item.localEntityType === 'menuItems') {
        await removeLocalEntity('menuItems', item.localEntityId);
    }
}

export async function flushOutbox(remoteFetch) {
    if (!getIsOnline()) {
        return { flushed: 0, remaining: (await getOutbox()).length };
    }

    try {
        assertRemoteWriteAllowed();
    } catch (err) {
        return {
            flushed: 0,
            remaining: (await getOutbox()).length,
            blocked: true,
            error: err.message,
        };
    }

    const sessionIdMap = {};
    let flushed = 0;
    const outbox = await getOutbox();

    for (const item of outbox) {
        const path = remapPath(item.path, sessionIdMap);
        const body = item.body ? remapBody(item.body, sessionIdMap) : undefined;

        try {
            const data = await remoteFetch(path, {
                method: item.method,
                body: body ? JSON.stringify(body) : undefined,
                _remoteOnly: true,
            });

            const serverId = extractServerId(data, item);
            await applyIdRemap(item, serverId, sessionIdMap);
            await removeOutboxItem(item.id);
            flushed += 1;
        } catch (err) {
            await updateOutboxItem(item.id, {
                lastError: err.message || 'Sync failed',
                lastAttemptAt: Date.now(),
            });
            break;
        }
    }

    return {
        flushed,
        remaining: (await getOutbox()).length,
        idMap: sessionIdMap,
    };
}

export function isOfflineQueuedResult(data) {
    return !!data?.offlineQueued;
}

export async function resolveRestaurantIdForRead(restaurantId) {
    const idMap = await getIdMap();
    return remapId(restaurantId, idMap);
}
