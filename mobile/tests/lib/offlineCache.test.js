import {
    mergeMenuItemIntoDetail,
    removeMenuItemFromDetail,
    stripPendingSyncFlags,
} from '../../src/lib/offlineCache';

describe('offlineCache', () => {
    test('mergeMenuItemIntoDetail adds menu item to categories', () => {
        const detail = {
            restaurant: { _id: 'r1', menuItems: [] },
            menuByCategory: [],
            categories: [],
        };
        const menuItem = {
            _id: 'm1',
            name: 'Burger',
            category: 'Entree',
            _pendingSync: true,
        };
        const next = mergeMenuItemIntoDetail(detail, menuItem);
        expect(next.categories).toHaveLength(1);
        expect(next.categories[0].menuItems[0].name).toBe('Burger');
        expect(next.restaurant.menuItems).toHaveLength(1);
    });

    test('removeMenuItemFromDetail removes item from all groups', () => {
        const detail = {
            restaurant: {
                menuItems: [{ _id: 'm1', name: 'Burger', category: 'Entree' }],
            },
            categories: [{
                label: 'Entree',
                menuItems: [{ _id: 'm1', name: 'Burger', category: 'Entree' }],
            }],
        };
        const next = removeMenuItemFromDetail(detail, 'm1');
        expect(next.restaurant.menuItems).toHaveLength(0);
        expect(next.categories).toHaveLength(0);
    });

    test('stripPendingSyncFlags removes pending markers recursively', () => {
        const next = stripPendingSyncFlags({
            _pendingSync: true,
            restaurant: { _pendingSync: true, name: 'Cafe' },
        });
        expect(next._pendingSync).toBeUndefined();
        expect(next.restaurant._pendingSync).toBeUndefined();
        expect(next.restaurant.name).toBe('Cafe');
    });
});
