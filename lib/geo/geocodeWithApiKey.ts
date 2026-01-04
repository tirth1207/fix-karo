/**
 * Core utility to interact with a real External Geocoding API.
 * Uses Google Maps Geocoding API format by default.
 */
export async function geocodeWithRealApi(
    address: string,
    city: string,
    state: string,
    pincode: string
): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GEOCODING_API_KEY;
    const baseUrl = process.env.GEOCODING_API_URL || "https://maps.googleapis.com/maps/api/geocode/json";

    if (!apiKey) {
        console.error("[GeoAPI] Error: GEOCODING_API_KEY is not defined in environment variables.");
        return null;
    }

    const fullAddress = `${address}, ${city}, ${state}, ${pincode}`.trim();
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `${baseUrl}?address=${encodedAddress}&key=${apiKey}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`[GeoAPI] API request failed with status: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Handle Google Maps API specifically
        if (data.status === "OK" && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            console.log(`[GeoAPI] Success: Resolved coordinates for "${fullAddress}"`);
            return { lat: location.lat, lng: location.lng };
        }

        if (data.status === "ZERO_RESULTS") {
            console.warn(`[GeoAPI] Warning: No results found for address: "${fullAddress}"`);
            return null;
        }

        if (data.status === "OVER_QUERY_LIMIT") {
            console.error("[GeoAPI] Error: API rate limit exceeded (OVER_QUERY_LIMIT)");
            return null;
        }

        if (data.error_message) {
            console.error(`[GeoAPI] API Error: ${data.error_message}`);
        } else {
            console.error(`[GeoAPI] API returned unexpected status: ${data.status}`);
        }

        return null;
    } catch (error) {
        console.error(`[GeoAPI] Fetch Error: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
