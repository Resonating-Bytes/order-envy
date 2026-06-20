import {
    createLocalId,
    isLocalId,
    remapBody,
    remapId,
    remapPath,
} from '../../src/lib/offlineIds';

describe('offlineIds', () => {
    test('createLocalId and isLocalId', () => {
        const id = createLocalId();
        expect(id.startsWith('local_')).toBe(true);
        expect(isLocalId(id)).toBe(true);
        expect(isLocalId('507f1f77bcf86cd799439011')).toBe(false);
    });

    test('remapId uses idMap', () => {
        const idMap = { local_abc: '507f1f77bcf86cd799439011' };
        expect(remapId('local_abc', idMap)).toBe('507f1f77bcf86cd799439011');
        expect(remapId('507f1f77bcf86cd799439011', idMap)).toBe('507f1f77bcf86cd799439011');
    });

    test('remapPath substitutes local ids in path segments', () => {
        const idMap = { local_rest: 'real_rest' };
        expect(remapPath('/restaurants/local_rest/menu-items', idMap))
            .toBe('/restaurants/real_rest/menu-items');
    });

    test('remapBody substitutes local ids in JSON payload', () => {
        const idMap = { local_friend: 'real_friend' };
        const body = { friendId: 'local_friend', note: 'hello' };
        expect(remapBody(body, idMap)).toEqual({ friendId: 'real_friend', note: 'hello' });
    });
});
