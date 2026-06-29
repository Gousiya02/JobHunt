export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}


async function callNominatim(query: string): Promise<GeocodeResult | null> {
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

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name
    };
  } catch (error) {
    console.error('Nominatim request error:', error);
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || !address.trim()) return null;

  // 1. Try the full original address
  let result = await callNominatim(address);
  if (result) return result;

  // Wait 1000ms between calls to respect Nominatim usage policy
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. Clean the address and try again
  // Regex to match landmarks or directions (e.g., "opposite ...", "near ...", "beside ...", "behind ...", etc.)
  const landmarkRegex = /\b(opposite|near|beside|behind|next\s+to|close\s+to|adj|adjacent\s+to|floor|shop\s+no|door\s+no|cross|main|street|road)\b.*/i;

  const parts = address.split(',').map(p => p.trim());
  const cleanParts = parts.filter(p => !landmarkRegex.test(p) && p.length > 0);
  
  if (cleanParts.length > 0 && cleanParts.join(', ') !== address) {
    result = await callNominatim(cleanParts.join(', '));
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 3. Fallback: progressively strip details from the left side (like specific room, door, or shop numbers)
  for (let i = 1; i < parts.length; i++) {
    const simplified = parts.slice(i).join(', ');
    // If we're down to just one part (e.g., just the city name "Bangalore"), stop to avoid matching random general centroids
    if (parts.length - i <= 1) break;

    result = await callNominatim(simplified);
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return null;
}

