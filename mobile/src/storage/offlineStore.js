import AsyncStorage from '@react-native-async-storage/async-storage';
import { CACHE_MAX_AGE_MS, LOCAL_SCHEMA_VERSION } from '../config/offline';

const KEYS = {
    schema: 'orderenvy_offline_schema',
    cache: 'orderenvy_offline_cache',
    outbox: 'orderenvy_offline_outbox',
    localEntities: 'orderenvy_offline_entities',
    idMap: 'orderenvy_offline_id_map',
    syncMeta: 'orderenvy_offline_sync',
};

const fetchMetaListeners = new Set();
const pendingListeners = new Set();

async function readJson(key, fallback) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

async function writeJson(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function subscribeFetchMeta(listener) {
    fetchMetaListeners.add(listener);
    return () => fetchMetaListeners.delete(listener);
}

export function emitFetchMeta(meta) {
    fetchMetaListeners.forEach((listener) => listener(meta));
}

export function clearFetchMeta() {
    emitFetchMeta({ fromCache: false, cachedAt: null });
}

export function subscribePendingChange(listener) {
    pendingListeners.add(listener);
    return () => pendingListeners.delete(listener);
}

export function emitPendingChange() {
    pendingListeners.forEach((listener) => listener());
}

export async function ensureOfflineSchema() {
    const stored = await AsyncStorage.getItem(KEYS.schema);
    const version = stored ? Number(stored) : null;
    if (version === LOCAL_SCHEMA_VERSION) return;

    await AsyncStorage.multiRemove([
        KEYS.cache,
        KEYS.outbox,
        KEYS.localEntities,
        KEYS.idMap,
    ]);
    await AsyncStorage.setItem(KEYS.schema, String(LOCAL_SCHEMA_VERSION));
}

export async function getCache(path) {
    return getCacheEntry(path, { allowStale: false });
}

export async function getCacheEntry(path, { allowStale = false, touch = true } = {}) {
    const cache = await readJson(KEYS.cache, {});
    const entry = cache[path];
    if (!entry) return null;
    const ageMs = Date.now() - (entry.lastAccessedAt || entry.cachedAt);
    if (!allowStale && ageMs > CACHE_MAX_AGE_MS) return null;
    if (touch) {
        entry.lastAccessedAt = Date.now();
        await writeJson(KEYS.cache, cache);
    }
    return entry;
}

function buildCacheEntry(path, data, meta = {}) {
    const now = Date.now();
    const entry = {
        data,
        cachedAt: now,
        lastAccessedAt: now,
        ...meta,
    };

    if (meta.lat == null || meta.long == null) {
        const detailMatch = path.match(/^\/restaurants\/([^/?]+)$/);
        if (detailMatch && data?.restaurant?.location) {
            const { lat, long } = data.restaurant.location;
            if (lat != null && long != null) {
                entry.lat = Number(lat);
                entry.long = Number(long);
            }
        }
    }

    return entry;
}

export async function setCache(path, data, meta = {}) {
    const cache = await readJson(KEYS.cache, {});
    cache[path] = buildCacheEntry(path, data, meta);
    await writeJson(KEYS.cache, cache);
}

export async function removeCachePath(path) {
    const cache = await readJson(KEYS.cache, {});
    if (!cache[path]) return false;
    delete cache[path];
    await writeJson(KEYS.cache, cache);
    return true;
}

export async function getSyncMeta() {
    return readJson(KEYS.syncMeta, {
        lastSyncedAt: null,
        lastLat: null,
        lastLong: null,
    });
}

export async function setSyncMeta(patch) {
    const current = await getSyncMeta();
    await writeJson(KEYS.syncMeta, { ...current, ...patch });
}

export async function readCacheMap() {
    return readJson(KEYS.cache, {});
}

export async function writeCacheMap(cache) {
    await writeJson(KEYS.cache, cache);
}

const syncListeners = new Set();

export function subscribeSyncComplete(listener) {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
}

export function emitSyncComplete(result) {
    syncListeners.forEach((listener) => listener(result));
}

export async function patchRestaurantListCache(mutator) {
    const cacheMap = await readJson(KEYS.cache, {});
    let listPaths = Object.keys(cacheMap).filter((path) => (
        path.startsWith('/restaurants') && !path.includes('/restaurants/')
    ));
    if (!listPaths.length) {
        await setCache('/restaurants', { restaurants: [], recommendations: [] });
        listPaths = ['/restaurants'];
    }
    for (const path of listPaths) {
        const entry = await getCache(path);
        if (!entry?.data?.restaurants) continue;
        const next = mutator(entry.data);
        if (next) {
            await setCache(path, next);
        }
    }
}

export async function getOutbox() {
    const outbox = await readJson(KEYS.outbox, []);
    return outbox.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveOutbox(outbox) {
    await writeJson(KEYS.outbox, outbox);
}

export async function addOutboxItem(item) {
    const outbox = await getOutbox();
    outbox.push(item);
    await saveOutbox(outbox);
    emitPendingChange();
    return item;
}

export async function removeOutboxItem(itemId) {
    const outbox = await getOutbox();
    await saveOutbox(outbox.filter((item) => item.id !== itemId));
    emitPendingChange();
}

export async function updateOutboxItem(itemId, patch) {
    const outbox = await getOutbox();
    const next = outbox.map((item) => (
        item.id === itemId ? { ...item, ...patch } : item
    ));
    await saveOutbox(next);
}

export async function getLocalEntities() {
    return readJson(KEYS.localEntities, {
        restaurants: {},
        menuItems: {},
    });
}

export async function saveLocalEntities(entities) {
    await writeJson(KEYS.localEntities, entities);
}

export async function getLocalEntity(type, id) {
    const entities = await getLocalEntities();
    return entities[type]?.[id] || null;
}

export async function setLocalEntity(type, id, value) {
    const entities = await getLocalEntities();
    entities[type] = {
        ...(entities[type] || {}),
        [id]: value,
    };
    await saveLocalEntities(entities);
}

export async function removeLocalEntity(type, id) {
    const entities = await getLocalEntities();
    if (!entities[type]?.[id]) return;
    delete entities[type][id];
    await saveLocalEntities(entities);
}

export async function getIdMap() {
    return readJson(KEYS.idMap, {});
}

export async function setIdMapEntry(localId, serverId) {
    const idMap = await getIdMap();
    idMap[localId] = serverId;
    await writeJson(KEYS.idMap, idMap);
}

export async function resolveEntityId(id) {
    if (!id) return id;
    const idMap = await getIdMap();
    return idMap[id] || id;
}

export async function clearOfflineData() {
    await AsyncStorage.multiRemove([
        KEYS.cache,
        KEYS.outbox,
        KEYS.localEntities,
        KEYS.idMap,
        KEYS.syncMeta,
    ]);
}
