const LOCAL_ID_PREFIX = 'local_';

export function createLocalId() {
    const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    return `${LOCAL_ID_PREFIX}${suffix}`;
}

export function isLocalId(id) {
    return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX);
}

export function remapId(id, idMap) {
    if (!id || !idMap) return id;
    return idMap[id] || id;
}

export function remapPath(path, idMap) {
    if (!idMap || !path) return path;
    let next = path;
    Object.entries(idMap).forEach(([localId, serverId]) => {
        next = next.split(localId).join(serverId);
    });
    return next;
}

export function remapBody(body, idMap) {
    if (!body || !idMap) return body;
    const raw = JSON.stringify(body);
    let next = raw;
    Object.entries(idMap).forEach(([localId, serverId]) => {
        next = next.split(localId).join(serverId);
    });
    return JSON.parse(next);
}
