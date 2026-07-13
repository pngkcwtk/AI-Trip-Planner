import { generateSearchPlan } from "./gemini.service.js";
import { searchPlacesByKeywords } from "./osmPlaces.service.js";
import { computeOptimizedRoute } from "./openRouteService.service.js";

const stopCounts = {
  short: 4,
  medium: 6,
  long: 8,
};

export async function generateItinerary(preferences) {
  const normalized = normalizePreferences(preferences);
  const aiPlan = await generateSearchPlan(normalized);
  const places = await searchPlacesByKeywords(aiPlan.keywords, normalized);

  if (places.length === 0) {
    throw new Error("No attractions found for this destination.");
  }

  const selectedPlaces = selectPlaces(places, normalized, aiPlan);
  const route = await computeOptimizedRoute(selectedPlaces);
  const itinerary = buildTimeline(route.orderedPlaces, route.legs, normalized, aiPlan);

  return {
    preferences: normalized,
    aiPlan,
    itinerary,
    map: {
      center: route.orderedPlaces[0]?.location ?? null,
      routeGeojson: route.geojson,
      legGeojson: route.legs.map((leg) => leg.geojson).filter(Boolean),
      markers: route.orderedPlaces.map((place, index) => ({
        id: place.id,
        label: String(index + 1),
        name: place.name,
        location: place.location,
      })),
    },
    summary: {
      totalStops: itinerary.length,
      totalDistance: formatMeters(route.totalDistanceMeters),
      totalDistanceMeters: route.totalDistanceMeters,
      totalTravelTime: formatSeconds(route.totalDurationSeconds),
      totalTravelSeconds: route.totalDurationSeconds,
      availableTime: formatMinutes(
        toMinutes(normalized.endTime) - toMinutes(normalized.startTime),
      ),
    },
  };
}

export function normalizePreferences(input) {
  const interests = Array.isArray(input.interests)
    ? input.interests.filter(Boolean)
    : [];

  if (!input.destination || !input.travelDate || !input.startTime || !input.endTime) {
    throw new Error("Destination, travel date, start time, and end time are required.");
  }

  if (toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    throw new Error("End time must be later than start time.");
  }

  if (interests.length === 0) {
    throw new Error("Select at least one interest.");
  }

  return {
    destination: String(input.destination).trim(),
    travelDate: String(input.travelDate),
    startTime: String(input.startTime),
    endTime: String(input.endTime),
    budget: Number(input.budget) || 0,
    travelers: Math.max(1, Number(input.travelers) || 1),
    interests,
  };
}

function selectPlaces(places, preferences, aiPlan) {
  const availableMinutes = toMinutes(preferences.endTime) - toMinutes(preferences.startTime);
  const tripLength =
    availableMinutes <= 360 ? "short" : availableMinutes <= 600 ? "medium" : "long";
  const idealCount = Math.min(
    stopCounts[tripLength],
    Math.max(3, Math.floor(availableMinutes / aiPlan.paceMinutesPerStop)),
  );

  return places
    .map((place) => ({ place, score: scoreForPreference(place, preferences) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(idealCount, places.length))
    .map((item) => item.place);
}

function scoreForPreference(place, preferences) {
  const text = `${place.name} ${place.type} ${place.keyword}`.toLowerCase();
  const interestMatch = preferences.interests.some((interest) =>
    text.includes(interest.toLowerCase()),
  )
    ? 25
    : 0;
  const familyBonus =
    preferences.interests.includes("Family") && text.includes("family") ? 15 : 0;

  return (
    (place.importance ?? 0) * 100 +
    interestMatch +
    familyBonus +
    (place.openingHours.length ? 10 : 0)
  );
}

function buildTimeline(places, legs, preferences, aiPlan) {
  let current = toMinutes(preferences.startTime);
  const dayIndex = new Date(`${preferences.travelDate}T00:00:00`).getDay();
  const visitMinutes = aiPlan.paceMinutesPerStop;

  return places.map((place, index) => {
    const inboundLeg = index === 0 ? null : legs[index - 1];
    current += inboundLeg?.durationSeconds
      ? Math.round(inboundLeg.durationSeconds / 60)
      : 0;

    const arrival = current;
    const departure = Math.min(arrival + visitMinutes, toMinutes(preferences.endTime));
    current = departure;

    return {
      id: place.id,
      order: index + 1,
      arrivalTime: fromMinutes(arrival),
      departureTime: fromMinutes(departure),
      name: place.name,
      type: titleCase(place.type),
      address: place.address,
      location: place.location,
      openingHours: place.openingHours,
      openStatus: validateOpeningHours(place, dayIndex),
      osmUrl: place.osmUrl,
      websiteUri: place.websiteUri,
      travelFromPrevious:
        index === 0
          ? null
          : {
              distance: formatMeters(inboundLeg?.distanceMeters ?? 0),
              duration: formatSeconds(inboundLeg?.durationSeconds ?? 0),
              unavailable: Boolean(inboundLeg?.unavailable),
            },
    };
  });
}

function validateOpeningHours(place, dayIndex) {
  if (place.openNow === true) return "Open now";
  if (place.openNow === false) return "May be closed now";

  const description = place.openingHours?.[dayIndex];
  if (!description) return "Opening hours not available";
  if (description.toLowerCase().includes("closed")) return "Closed on travel day";
  return description;
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatMeters(meters) {
  if (!meters) return "Not available";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatSeconds(seconds) {
  if (!seconds) return "Not available";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function titleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
