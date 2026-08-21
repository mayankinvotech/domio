/**
 * lib/geo.ts
 *
 * Distance calculation and geocoding utilities for location-based searches.
 */

// Calculate distance between two coordinates in kilometers using the Haversine formula
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Basic geocoding simulation / string similarity fallback when lat/lng are not set.
 * Returns approximate distance score (0 to 100 km) based on text match if coordinates missing.
 */
export function estimateAddressMatchDistanceKm(
  searchQuery: string,
  propertyAddress: string,
  propertyCity: string,
  propertyCountry: string,
): number {
  const query = searchQuery.toLowerCase().trim();
  const address = propertyAddress.toLowerCase();
  const city = propertyCity.toLowerCase();
  const country = propertyCountry.toLowerCase();
  const fullLoc = `${address}, ${city}, ${country}`;

  if (fullLoc.includes(query) || query.includes(city) || query.includes(address)) {
    // Direct string match on city or address -> very close (< 2 km)
    return 1.2;
  }

  // Token match score
  const queryTokens = query.split(/\s+/).filter((t) => t.length > 2);
  let matches = 0;
  for (const token of queryTokens) {
    if (fullLoc.includes(token)) matches++;
  }

  if (matches > 0) {
    return Math.max(0.5, 10 - matches * 2.5);
  }

  return 25.0; // Default fallback distance if no direct text overlap
}

/**
 * Geocodes an address string using free OpenStreetMap Nominatim API.
 * Returns { lat, lon } or null if not found/timed out.
 */
export async function geocodeAddress(
  addressString: string,
): Promise<{ lat: number; lon: number } | null> {
  if (!addressString || !addressString.trim()) return null;

  try {
    const query = encodeURIComponent(addressString.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'Domio-Property-Management/1.0',
        },
        signal: AbortSignal.timeout(3000), // 3s timeout
      },
    );

    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { lat, lon };
      }
    }
  } catch {
    // Network error or timeout - return null gracefully
  }

  return null;
}
