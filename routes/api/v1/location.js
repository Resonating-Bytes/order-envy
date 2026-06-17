const express = require('express');
const locationService = require('../../../services/locationService');
const { asyncHandler, sendJson } = require('../../../lib/apiHelpers');

const router = express.Router();

router.get('/latlong/:address', asyncHandler(async (req, res) => {
    const result = await locationService.geocodeAddress(req.params.address);
    sendJson(res, 200, result);
}));

router.get('/address', asyncHandler(async (req, res) => {
    const { lat, long } = req.query;
    const result = await locationService.reverseGeocode(lat, long);
    sendJson(res, 200, result);
}));

module.exports = router;
