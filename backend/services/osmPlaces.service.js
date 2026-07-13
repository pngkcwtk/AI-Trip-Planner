const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function searchPlacesByKeywords(keywords) {
  const results = [];

  for (const keyword of keywords) {
    const places = await searchNominatim(keyword);
    results.push(...places);
    await wait(1100);
  }

  return dedupePlaces(results).slice(0, 24);
}

async function searchNominatim(keyword) {
  const params = new URLSearchParams({
    q: keyword,
    format: "jsonv2",
    limit: "8",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    layer: "poi,natural,manmade",
    "accept-language": "en",
  });

  let response;
  try {
    response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "AITripPlanner/1.0 (local development)",
        Referer: "http://localhost:4000",
      },
    });
  } catch (error) {
    throw new Error(
      `OpenStreetMap Nominatim network request failed: ${
        error instanceof Error ? error.message : "Unknown network error"
      }`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenStreetMap Nominatim failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.map((place) => normalizePlace(place, keyword)).filter(Boolean);
}

function normalizePlace(place, keyword) {
  const lat = Number(place.lat);
  const lng = Number(place.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const name = place.namedetails?.name ?? place.name ?? firstDisplayName(place.display_name);
  const type = place.type ?? place.addresstype ?? place.category ?? "Attraction";
  const openingHours = place.extratags?.opening_hours
    ? [place.extratags.opening_hours]
    : [];

  return {
    id: `${place.osm_type ?? "osm"}-${place.osm_id ?? place.place_id}`,
    name: name || "Unnamed place",
    keyword,
    type,
    address: place.display_name ?? "Not available",
    location: { lat, lng },
    openingHours,
    openNow: null,
    osmUrl:
      place.osm_type && place.osm_id
        ? `https://www.openstreetmap.org/${osmTypePath(place.osm_type)}/${place.osm_id}`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
    websiteUri: place.extratags?.website ?? place.extratags?.url ?? null,
    importance: Number(place.importance ?? 0),
  };
}

function dedupePlaces(places) {
  const seen = new Set();
  const unique = [];

  for (const place of places) {
    const key =
      place.id ||
      `${place.name}-${place.location.lat.toFixed(5)}-${place.location.lng.toFixed(5)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(place);
    }
  }

  return unique.sort((a, b) => scorePlace(b) - scorePlace(a));
}

function scorePlace(place) {
  return (
    (place.importance ?? 0) * 100 +
    (place.openingHours.length ? 10 : 0) +
    (place.websiteUri ? 5 : 0)
  );
}

function firstDisplayName(displayName) {
  return String(displayName ?? "").split(",")[0]?.trim();
}

function osmTypePath(osmType) {
  if (osmType === "N") return "node";
  if (osmType === "W") return "way";
  if (osmType === "R") return "relation";
  return "node";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
