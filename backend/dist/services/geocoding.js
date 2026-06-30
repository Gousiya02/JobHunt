"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeAddress = geocodeAddress;
async function callNominatim(query) {
    try {
        let finalQuery = query;
        if (!/bangalore|bengaluru/i.test(query)) {
            finalQuery = `${query}, Bangalore`;
        }
        const encodedQuery = encodeURIComponent(finalQuery);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=in`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LocalJobFinderApp/1.0 (contact: support@localjobfinder.local)'
            }
        });
        if (!response.ok) {
            console.error('Nominatim API error:', response.statusText);
            return null;
        }
        const data = (await response.json());
        if (!data || data.length === 0) {
            return null;
        }
        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name
        };
    }
    catch (error) {
        console.error('Nominatim request error:', error);
        return null;
    }
}
async function geocodeAddress(address) {
    if (!address || !address.trim())
        return null;
    let result = await callNominatim(address);
    if (result)
        return result;
    await new Promise(resolve => setTimeout(resolve, 1000));
    const landmarkRegex = /\b(opposite|near|beside|behind|next\s+to|close\s+to|adj|adjacent\s+to|floor|shop\s+no|door\s+no|cross|main|street|road)\b.*/i;
    const parts = address.split(',').map(p => p.trim());
    const cleanParts = parts.filter(p => !landmarkRegex.test(p) && p.length > 0);
    if (cleanParts.length > 0 && cleanParts.join(', ') !== address) {
        result = await callNominatim(cleanParts.join(', '));
        if (result)
            return result;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    for (let i = 1; i < parts.length; i++) {
        const simplified = parts.slice(i).join(', ');
        if (parts.length - i <= 1)
            break;
        result = await callNominatim(simplified);
        if (result)
            return result;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Fallback to Bangalore if geocoding fails completely, preserving the original address text
    const fallback = await callNominatim("Bangalore, Karnataka, India");
    if (fallback) {
        return {
            lat: fallback.lat,
            lng: fallback.lng,
            displayName: address
        };
    }
    return {
        lat: 12.9716,
        lng: 77.5946,
        displayName: address
    };
}
