export function normalizeFriend(friend) {
    if (!friend) return null;

    const id = friend.id || friend._id || (typeof friend === 'string' ? friend : null);
    if (!id) return null;

    const displayName = friend.displayName
        || friend.fullName
        || friend.username
        || friend.email
        || (friend.firstName && friend.lastName
            ? `${friend.firstName} ${friend.lastName}`
            : friend.firstName)
        || 'Friend';

    return { id: String(id), displayName };
}
