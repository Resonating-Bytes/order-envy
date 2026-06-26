/**
 * Merge rules for regional cache: server is authoritative unless the user has pending local edits.
 */

export function mergeRestaurantListFromServer(serverData = {}, cachedData = {}, protectedIds = new Set()) {
    const serverRestaurants = serverData.restaurants || [];
    const cachedById = new Map(
        (cachedData.restaurants || []).map((row) => [String(row._id), row]),
    );
    const protectedSet = new Set([...protectedIds].map(String));
    const seen = new Set();

    const merged = serverRestaurants.map((serverRow) => {
        const id = String(serverRow._id);
        seen.add(id);
        if (!protectedSet.has(id)) {
            return serverRow;
        }
        const local = cachedById.get(id);
        if (!local) return serverRow;
        return {
            ...serverRow,
            ...local,
            _pendingSync: local._pendingSync || serverRow._pendingSync,
        };
    });

    protectedSet.forEach((id) => {
        if (seen.has(id)) return;
        const local = cachedById.get(id);
        if (local) {
            merged.unshift(local);
        }
    });

    return {
        ...serverData,
        restaurants: merged,
    };
}

export function mergeRestaurantListDelta(deltaData = {}, cachedData = {}, protectedIds = new Set()) {
    const cachedById = new Map(
        (cachedData.restaurants || []).map((row) => [String(row._id), row]),
    );
    const protectedSet = new Set([...protectedIds].map(String));

    (deltaData.restaurants || []).forEach((serverRow) => {
        const id = String(serverRow._id);
        if (!protectedSet.has(id)) {
            cachedById.set(id, serverRow);
            return;
        }
        const local = cachedById.get(id);
        cachedById.set(id, local ? {
            ...serverRow,
            ...local,
            _pendingSync: local._pendingSync || serverRow._pendingSync,
        } : serverRow);
    });

    (deltaData.deletedRestaurantIds || []).forEach((id) => {
        if (!protectedSet.has(String(id))) {
            cachedById.delete(String(id));
        }
    });

    return {
        ...cachedData,
        mode: deltaData.mode,
        syncedAt: deltaData.syncedAt,
        restaurants: Array.from(cachedById.values()),
        recommendations: deltaData.recommendations ?? cachedData.recommendations ?? [],
    };
}

export function applyListSyncResponse(serverData = {}, cachedData = {}, protectedIds = new Set()) {
    if (serverData.mode === 'delta') {
        return mergeRestaurantListDelta(serverData, cachedData, protectedIds);
    }
    return mergeRestaurantListFromServer(serverData, cachedData, protectedIds);
}

export function mergeRestaurantDetailFromServer(serverDetail, cachedDetail, { isProtected = false } = {}) {
    if (!isProtected || !cachedDetail) {
        return serverDetail;
    }
    return {
        ...serverDetail,
        ...cachedDetail,
        restaurant: {
            ...(serverDetail?.restaurant || {}),
            ...(cachedDetail?.restaurant || {}),
            _pendingSync: cachedDetail?.restaurant?._pendingSync
                || serverDetail?.restaurant?._pendingSync,
        },
        menuByCategory: cachedDetail.menuByCategory || serverDetail.menuByCategory,
        categories: cachedDetail.categories || cachedDetail.menuByCategory
            || serverDetail.categories
            || serverDetail.menuByCategory,
    };
}
