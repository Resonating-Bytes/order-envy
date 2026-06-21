function remapDataValue(value, idMap) {
    if (typeof value === 'string' && idMap[value]) {
        return idMap[value];
    }
    if (Array.isArray(value)) {
        return value.map((item) => remapDataValue(item, idMap));
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => {
                const nextKey = idMap[key] || key;
                return [nextKey, remapDataValue(nested, idMap)];
            }),
        );
    }
    return value;
}

export function stripPendingSyncFlags(data) {
    if (Array.isArray(data)) {
        return data.map(stripPendingSyncFlags);
    }
    if (!data || typeof data !== 'object') {
        return data;
    }
    const next = { ...data };
    if (next._pendingSync) {
        delete next._pendingSync;
    }
    Object.keys(next).forEach((key) => {
        next[key] = stripPendingSyncFlags(next[key]);
    });
    return next;
}

export async function patchRestaurantDetailCache(restaurantId, mutator, store) {
    const path = `/restaurants/${restaurantId}`;
    const entry = await store.getCache(path);
    if (!entry?.data) return;
    const nextData = mutator(entry.data);
    if (nextData) {
        await store.setCache(path, nextData);
    }
}

export async function applySyncIdMapToCaches(idMap, store) {
    if (!idMap || !Object.keys(idMap).length) return;

    const cache = await store.readCacheMap();
    const next = { ...cache };

    Object.entries(idMap).forEach(([localId, serverId]) => {
        Object.entries(cache).forEach(([path, entry]) => {
            if (!path.includes(localId)) return;
            const newPath = path.split(localId).join(serverId);
            const data = stripPendingSyncFlags(remapDataValue(entry.data, idMap));
            next[newPath] = {
                ...entry,
                data,
                cachedAt: Date.now(),
            };
            if (newPath !== path) {
                delete next[path];
            }
        });
    });

    await store.writeCacheMap(next);
}

export function mergeMenuItemIntoDetail(detailData, menuItem) {
    if (!detailData?.restaurant) return detailData;
    const restaurant = { ...detailData.restaurant };
    const menuItems = [...(restaurant.menuItems || [])];
    const index = menuItems.findIndex((item) => String(item._id) === String(menuItem._id));
    if (index >= 0) {
        menuItems[index] = menuItem;
    } else {
        menuItems.push(menuItem);
    }
    restaurant.menuItems = menuItems;

    const categoryLabel = menuItem.category;
    let found = false;
    const menuByCategory = (detailData.menuByCategory || []).map((group) => {
        if (group.label !== categoryLabel) return group;
        found = true;
        const items = [...group.menuItems];
        const itemIndex = items.findIndex((item) => String(item._id) === String(menuItem._id));
        if (itemIndex >= 0) {
            items[itemIndex] = menuItem;
        } else {
            items.push(menuItem);
        }
        return { ...group, menuItems: items };
    });

    if (!found) {
        menuByCategory.push({ label: categoryLabel, menuItems: [menuItem] });
    }

    return {
        ...detailData,
        restaurant,
        menuByCategory,
        categories: menuByCategory,
    };
}

export function removeMenuItemFromDetail(detailData, menuItemId) {
    if (!detailData?.restaurant) return detailData;
    const restaurant = {
        ...detailData.restaurant,
        menuItems: (detailData.restaurant.menuItems || []).filter(
            (item) => String(item._id) !== String(menuItemId),
        ),
    };
    const menuByCategory = (detailData.menuByCategory || detailData.categories || [])
        .map((group) => ({
            ...group,
            menuItems: group.menuItems.filter(
                (item) => String(item._id) !== String(menuItemId),
            ),
        }))
        .filter((group) => group.menuItems.length > 0);
    return {
        ...detailData,
        restaurant,
        menuByCategory,
        categories: menuByCategory,
    };
}
