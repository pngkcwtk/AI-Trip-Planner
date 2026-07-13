import { config } from "../config.js";

const ORS_DIRECTIONS_URL =
  "https://api.openrouteservice.org/v2/directions/driving-car/geojson";

export async function computeOptimizedRoute(places) {
  if (!config.orsApiKey) {
    throw new Error("ORS_API_KEY is missing.");
  }

  if (places.length < 2) {
    return {
      orderedPlaces: places,
      legs: [],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      geojson: null,
    };
  }

  const orderedPlaces = nearestNeighborOrder(places);
  const route = await requestRoute(orderedPlaces);
  const pairLegs = await computePairLegs(orderedPlaces);

  return {
    orderedPlaces,
    legs: pairLegs,
    totalDistanceMeters:
      route.distanceMeters ||
      pairLegs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
    totalDurationSeconds:
      route.durationSeconds ||
      pairLegs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
    geojson: route.geojson,
  };
}

async function computePairLegs(places) {
  const legs = [];

  for (let index = 0; index < places.length - 1; index += 1) {
    const from = places[index];
    const to = places[index + 1];

    try {
      const route = await requestRoute([from, to]);
      legs.push({
        fromId: from.id,
        toId: to.id,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        geojson: route.geojson,
      });
    } catch {
      legs.push(createUnavailableLeg(from, to));
    }
  }

  return legs;
}

async function requestRoute(places) {
  let response;
  try {
    response = await fetch(ORS_DIRECTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: config.orsApiKey,
        "Content-Type": "application/json",
        Accept: "application/json, application/geo+json",
      },
      body: JSON.stringify({
        coordinates: places.map((place) => [
          place.location.lng,
          place.location.lat,
        ]),
        instructions: false,
        preference: "recommended",
        units: "m",
      }),
    });
  } catch (error) {
    throw new Error(
      `OpenRouteService network request failed: ${
        error instanceof Error ? error.message : "Unknown network error"
      }`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouteService failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const summary = data.features?.[0]?.properties?.summary;

  return {
    distanceMeters: Math.round(summary?.distance ?? 0),
    durationSeconds: Math.round(summary?.duration ?? 0),
    geojson: data,
  };
}

function nearestNeighborOrder(places) {
  if (places.length <= 2) return places;

  const remaining = places.slice(1);
  const ordered = [places[0]];

  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((candidate, index) => {
      const distance = haversineMeters(current.location, candidate.location);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return ordered;
}

function haversineMeters(a, b) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function createUnavailableLeg(from, to) {
  return {
    fromId: from.id,
    toId: to.id,
    distanceMeters: 0,
    durationSeconds: 0,
    geojson: null,
    unavailable: true,
  };
}
