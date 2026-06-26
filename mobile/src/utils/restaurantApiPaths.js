export function buildRestaurantsListPath({ lat, long, filterDist, since } = {}) {
    const params = new URLSearchParams();

    if (filterDist === 'all') {
        params.set('filterDist', 'all');
    } else if (lat != null && long != null && filterDist != null) {
        params.set('lat', String(lat));
        params.set('long', String(long));
        params.set('filterDist', String(filterDist));
    }

    if (since != null) {
        params.set('since', String(since));
    }

    const query = params.toString();
    return `/restaurants${query ? `?${query}` : ''}`;
}
