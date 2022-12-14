function getCookieValue(cookieName) {
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    cookieName += '=';
    for (let i = 0; i < ca.length; i++) {
        const c = ca[i].trim();
        if (c.indexOf(cookieName) == 0) {
            return c.substring(cookieName.length, c.length);
        }
    }

    return undefined;
}

function findMe(reason) {
    if (!navigator.geolocation) {
        console.warn(`Geolocation is not supported by your browser`);
        return;
    }

    const success = (position) => {
        const {latitude, longitude} = position.coords;

        if (reason === 'form') {
            // set addr using reverse geocoding
            const url = `/location/address?lat=${latitude}&long=${longitude}`;
            fetch(url).then(data => data.json()).then(res => {
                try {
                    const {street, city, state, postalCode} = res;
                    const addrElem = document.getElementById('address');
                    if (addrElem && street && city && state && postalCode) {
                        addrElem.value = `${street}, ${city} ${state} ${postalCode}`;
                    }
                } catch (err) {
                    console.error(`Error getting address: ${err}`);
                }
            });

            const latElem = document.getElementById('lat');
            const longELem = document.getElementById('long');
            if (latElem && longELem) {
                latElem.value = latitude;
                longELem.value = longitude;
                const findMeElem = document.getElementById('findMe');
                if (findMeElem) {
                    findMeElem.style.display = "none";
                }
            }
        } else if (reason === 'cookie') {
            const reloadPage = (isNaN(Number(getCookieValue('lat'))) || isNaN(Number(getCookieValue('long'))));

            // set them to expire in 3 hours, but always update them
            // that way they are as current as possible, but we don't keep forcing the page to reload
            const expTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
            const expires = `expires=${expTime.toUTCString()}`;
            document.cookie = `lat=${latitude}; ${expires}`;
            document.cookie = `long=${longitude}; ${expires}`;

            // reload the page if they were set properly and they didn't exist to start with
            if (reloadPage && getCookieValue('lat') && getCookieValue('long')) {
                window.location.reload();
            }
        }
    };

    const error = () => {
        console.warn(`Unable to retrieve your location`);
    };

    // if there are valid cookies for the location, call the succes function immediately
    // otherwise, ask the user for permission to use their location
    const lat = Number(getCookieValue('lat'));
    const long = Number(getCookieValue('long'));
    if (!isNaN(lat) && !isNaN(long)) {
        success({
            coords: {
                latitude: lat,
                longitude: long,
            }
        });
    } else {
        navigator.geolocation.getCurrentPosition(success, error);
    }
}

function validateAddress(formName) {
    // if the lat/long hidden fields aren't filled in, try to generate them from the address
    let latElem = document.getElementById('lat');
    let longElem = document.getElementById('long');
    if (isNaN(Number(latElem.value)) || isNaN(Number(longElem.value))) {
        // if there is no address, don't bother trying to get the lat/long
        const address = encodeURIComponent(document.getElementById('address').value);
        if (!address) {
            return true;
        }

        const url = `/location/latlong/${address}`;
        fetch(url).then(data => data.json()).then(res => {
            try {
                const {lat, lng} = res;
                if (lat && lng) {
                    latElem.value = lat;
                    longElem.value = lng;
                }
            } catch (err) {
                console.error(`Error geocoding address: ${err}`);
            }

            document.getElementById(formName).submit();
        });
        return false;
    }

    return true;
}

function invalidateLatLong() {
    try {
        document.getElementById('lat').value = undefined;
        document.getElementById('long').value = undefined;

        const findMeElem = document.getElementById('findMe');
        if (findMeElem) {
            findMeElem.style.display = "inline-block";
        }
    } catch(err) {
        console.error(`Failed to clear the lat/long fields: ${err}`);
    }
}

function loadFilterByDistance(filterDistStr) {
    const value = getCookieValue(filterDistStr);
    if (value) {
        document.getElementById(filterDistStr).value = value;
    }
}

function filterByDistance(filterDistStr) {
    try {
        // update the cookie value from the select element
        const dist = document.getElementById(filterDistStr).value;
        const reloadPage = (dist !== getCookieValue(filterDistStr));
        document.cookie = `${filterDistStr}=${dist}`;

        // reload the page if the value changed so it can rerender with the udpated value
        if (reloadPage) {
            window.location.reload();
        }
    } catch(err) {
        console.error(`Error changing the filter distance: ${err}`);
    }
}