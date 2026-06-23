const mongoose = require('mongoose');
const {
    userCanEditRestaurant,
    userCanDeleteRestaurant,
    userCanManageRestaurant,
    userCanManageEditors,
} = require('../../lib/restaurantPermissions');

describe('restaurantPermissions', () => {
    const userA = { _id: new mongoose.Types.ObjectId() };
    const userB = { _id: new mongoose.Types.ObjectId() };
    const userC = { _id: new mongoose.Types.ObjectId() };

    describe('unowned restaurant', () => {
        const restaurant = { name: 'Open Kitchen' };

        it('allows any logged-in user to edit', () => {
            expect(userCanEditRestaurant(userA, restaurant)).toBe(true);
        });

        it('allows any logged-in user to delete', () => {
            expect(userCanDeleteRestaurant(userA, restaurant)).toBe(true);
        });

        it('allows any logged-in user to claim (manage)', () => {
            expect(userCanManageRestaurant(userA, restaurant)).toBe(true);
        });

        it('denies anonymous users', () => {
            expect(userCanEditRestaurant(null, restaurant)).toBe(false);
        });
    });

    describe('owned restaurant', () => {
        const restaurant = {
            owner: userA._id,
            editors: [userB._id],
        };

        it('allows owner and editors to edit', () => {
            expect(userCanEditRestaurant(userA, restaurant)).toBe(true);
            expect(userCanEditRestaurant(userB, restaurant)).toBe(true);
        });

        it('denies other users edit access', () => {
            expect(userCanEditRestaurant(userC, restaurant)).toBe(false);
        });

        it('allows only owner to delete', () => {
            expect(userCanDeleteRestaurant(userA, restaurant)).toBe(true);
            expect(userCanDeleteRestaurant(userB, restaurant)).toBe(false);
        });

        it('allows only owner to claim/manage after ownership', () => {
            expect(userCanManageRestaurant(userA, restaurant)).toBe(true);
            expect(userCanManageRestaurant(userB, restaurant)).toBe(false);
        });

        it('allows only owner to manage editors', () => {
            expect(userCanManageEditors(userA, restaurant)).toBe(true);
            expect(userCanManageEditors(userB, restaurant)).toBe(false);
        });
    });

    describe('unclaimed restaurant', () => {
        const restaurant = { name: 'Open Kitchen' };

        it('denies editor management before ownership is claimed', () => {
            expect(userCanManageEditors(userA, restaurant)).toBe(false);
        });
    });
});
