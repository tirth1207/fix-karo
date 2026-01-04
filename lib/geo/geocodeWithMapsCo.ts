/**
 * Core utility to interact with the geocode.maps.co API.
 * Uses free-form query (q) for maximum compatibility.
 */
export async function geocodeWithMapsCo(
    address: string,
    city: string,
    state: string,
    pincode: string
): Promise<{ lat: number; lng: number } | null> {
    const apiKey = process.env.GEOCODING_API_KEY;
    const baseUrl = process.env.GEOCODING_API_URL || "https://geocode.maps.co/search";

    if (!apiKey) {
        console.error("[GeoAPI] GEOCODING_API_KEY is not defined");
        return null;
    }

    // Build a clean, deterministic query for logging
    const fullAddress = [address, city, state, pincode].filter(Boolean).join(", ");

    const url = new URL(baseUrl);

    // Set parameters in the specific order requested
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("limit", "1");
    url.searchParams.set("format", "json");
    url.searchParams.set("city", city);
    url.searchParams.set("state", state);
    url.searchParams.set("country", "india"); // Defaulting to india as per example
    url.searchParams.set("postalcode", pincode);
    url.searchParams.set("street", address);

    const debugUrl = url.toString().replace(apiKey, "REDACTED_API_KEY");
    console.log(`[GeoAPI] Requesting URL: ${debugUrl},${url}`);

    try {
        const response = await fetch(url.toString(), {
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            console.error(`[GeoAPI] MapsCo request failed: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
            };
        }

        console.warn(`[GeoAPI] No results found for: "${fullAddress}"`);
        return null;
    } catch (err) {
        console.error(
            `[GeoAPI] MapsCo Fetch Error: ${err instanceof Error ? err.message : String(err)
            }`
        );
        return null;
    }
}
