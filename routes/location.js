const express = require('express');
const router = express.Router({mergeParams: true});
const request = require('request');
const {flash, FlashType, getCookies} = require('../utils/misc');

const {GEO_KEY} = process.env;

router.get('/latlong/:address', (req, res) => {
    const address = encodeURIComponent(req.params.address);
    const url = `http://www.mapquestapi.com/geocoding/v1/address?key=${GEO_KEY}&location=${address}`;
    request(url, (error, response, body) => {
        if (error) {
            flash(req, res, FlashType.ERROR, `Something went wrong converting ${address} to a lat/long: ${error}`);
        } else if (response.statusCode == 200) {
            try {
                const {lat, lng} = JSON.parse(body).results[0].locations[0].latLng;
                return res.json({lat, lng});
            } catch(err) {
                console.error(`Error getting lat/long from ${address}: ${err}`);
            }
        } else {
            flash(req, res, FlashType.ERROR, `Something went wrong converting ${address} to a lat/long: error code: ${response.statusCode} body: ${response.body} statusMessage: ${response.statusMessage}`);
        }

        // if we made it here, something went wrong
        // just send an empty object back so the front end doesn't hang
        return res.json({});
    });
});

router.get('/address', (req, res) => {
    const cookies = getCookies(req);
    const lat = cookies['lat'];
    const long = cookies['long'];
    if (!(lat && long)) {
        return res.json({});
    }

    const url = `http://www.mapquestapi.com/geocoding/v1/reverse?key=${GEO_KEY}&location=${lat},${long}`;
    request(url, (error, response, body) => {
        if (error) {
            flash(req, res, FlashType.ERROR, `Something went wrong converting ${address} to a lat/long: ${error}`);
        } else if (response.statusCode == 200) {
            try {
                const {street, adminArea5, adminArea3, postalCode} = JSON.parse(body).results[0].locations[0];
                return res.json({
                    street,
                    city: adminArea5,
                    state: adminArea3,
                    postalCode,
                });
            } catch(err) {
                flash(req, res, FlashType.ERROR, `Error getting address from (${lat},${long}): ${err}`);
            }
        } else {
            flash(req, res, FlashType.ERROR, `Error getting address from (${lat},${long}): error code: ${response.statusCode} body: ${response.body} statusMessage: ${response.statusMessage}`);
        }

        // if we made it here, something went wrong
        // just send an empty object back so the front end doesn't hang
        return res.json({});
    });
});

module.exports = router;
