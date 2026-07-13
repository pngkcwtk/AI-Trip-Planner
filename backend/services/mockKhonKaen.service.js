const khonKaenStops = [
  {
    id: "mock-khon-kaen-1",
    name: "Wat Nong Wang",
    type: "Temple",
    address: "Nai Mueang, Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4096, lng: 102.8354 },
    openingHours: ["Daily 08:00-18:00"],
    openStatus: "Daily 08:00-18:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4096&mlon=102.8354#map=16/16.4096/102.8354",
    visitMinutes: 75,
  },
  {
    id: "mock-khon-kaen-2",
    name: "Bueng Kaen Nakhon",
    type: "Nature",
    address: "Kaen Nakhon Lake, Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4133, lng: 102.8341 },
    openingHours: ["Daily 05:00-21:00"],
    openStatus: "Daily 05:00-21:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4133&mlon=102.8341#map=15/16.4133/102.8341",
    visitMinutes: 60,
  },
  {
    id: "mock-khon-kaen-3",
    name: "Khon Kaen City Museum",
    type: "History",
    address: "Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4316, lng: 102.8236 },
    openingHours: ["Tue-Sun 09:00-17:00"],
    openStatus: "Tue-Sun 09:00-17:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4316&mlon=102.8236#map=15/16.4316/102.8236",
    visitMinutes: 75,
  },
  {
    id: "mock-khon-kaen-4",
    name: "Ton Tann Market",
    type: "Food",
    address: "Mittraphap Road, Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4074, lng: 102.8172 },
    openingHours: ["Daily 16:00-23:00"],
    openStatus: "Daily 16:00-23:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4074&mlon=102.8172#map=16/16.4074/102.8172",
    visitMinutes: 90,
  },
  {
    id: "mock-khon-kaen-5",
    name: "Central Khon Kaen",
    type: "Shopping",
    address: "99, 99/1 Srichan Road, Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4322, lng: 102.8253 },
    openingHours: ["Daily 10:00-21:00"],
    openStatus: "Daily 10:00-21:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4322&mlon=102.8253#map=16/16.4322/102.8253",
    visitMinutes: 75,
  },
  {
    id: "mock-khon-kaen-6",
    name: "Columbo Craft Village",
    type: "Cafe",
    address: "Mueang Khon Kaen District, Khon Kaen",
    location: { lat: 16.4666, lng: 102.8258 },
    openingHours: ["Daily 10:00-20:00"],
    openStatus: "Daily 10:00-20:00",
    osmUrl: "https://www.openstreetmap.org/?mlat=16.4666&mlon=102.8258#map=16/16.4666/102.8258",
    visitMinutes: 60,
  },
];

const mockLegs = [
  { distanceMeters: 700, durationSeconds: 420 },
  { distanceMeters: 4300, durationSeconds: 720 },
  { distanceMeters: 3900, durationSeconds: 780 },
  { distanceMeters: 4700, durationSeconds: 900 },
  { distanceMeters: 3900, durationSeconds: 720 },
];

export function isKhonKaenDestination(destination) {
  const normalized = String(destination ?? "").toLowerCase();
  return normalized.includes("khon kaen") || normalized.includes("ขอนแก่น");
}

export function generateKhonKaenMockItinerary(preferences, reason = "Mock data mode") {
  const selectedStops = selectMockStops(preferences);
  const itinerary = buildMockTimeline(selectedStops, preferences);
  const legs = mockLegs.slice(0, Math.max(0, selectedStops.length - 1));
  const totalDistanceMeters = legs.reduce((sum, leg) => sum + leg.distanceMeters, 0);
  const totalDurationSeconds = legs.reduce((sum, leg) => sum + leg.durationSeconds, 0);

  return {
    preferences,
    aiPlan: {
      keywords: preferences.interests.map((interest) => `${interest} in Khon Kaen`),
      strategy:
        "Mock Khon Kaen itinerary using local-style attractions while API keys are unavailable.",
      paceMinutesPerStop: 75,
      source: "mock",
      reason,
    },
    itinerary,
    map: {
      center: { lat: 16.4322, lng: 102.8236 },
      routeGeojson: createRouteGeojson(selectedStops),
      legGeojson: [],
      markers: selectedStops.map((place, index) => ({
        id: place.id,
        label: String(index + 1),
        name: place.name,
        location: place.location,
      })),
    },
    summary: {
      totalStops: itinerary.length,
      totalDistance: formatMeters(totalDistanceMeters),
      totalDistanceMeters,
      totalTravelTime: formatSeconds(totalDurationSeconds),
      totalTravelSeconds: totalDurationSeconds,
      availableTime: formatMinutes(toMinutes(preferences.endTime) - toMinutes(preferences.startTime)),
    },
    source: "mock-khon-kaen",
  };
}

function selectMockStops(preferences) {
  const interestSet = new Set(preferences.interests.map((interest) => interest.toLowerCase()));
  const preferred = khonKaenStops.filter((stop) => interestSet.has(stop.type.toLowerCase()));
  const combined = [...preferred, ...khonKaenStops.filter((stop) => !preferred.includes(stop))];
  const availableMinutes = toMinutes(preferences.endTime) - toMinutes(preferences.startTime);
  const count = Math.min(combined.length, Math.max(3, Math.floor(availableMinutes / 110)));
  return combined.slice(0, count);
}

function buildMockTimeline(stops, preferences) {
  let current = toMinutes(preferences.startTime);

  return stops.map((stop, index) => {
    const inboundLeg = index === 0 ? null : mockLegs[index - 1];
    current += inboundLeg ? Math.round(inboundLeg.durationSeconds / 60) : 0;
    const arrival = current;
    const departure = Math.min(arrival + stop.visitMinutes, toMinutes(preferences.endTime));
    current = departure;

    return {
      id: stop.id,
      order: index + 1,
      arrivalTime: fromMinutes(arrival),
      departureTime: fromMinutes(departure),
      name: stop.name,
      type: stop.type,
      address: stop.address,
      location: stop.location,
      openingHours: stop.openingHours,
      openStatus: stop.openStatus,
      osmUrl: stop.osmUrl,
      websiteUri: null,
      travelFromPrevious:
        index === 0
          ? null
          : {
              distance: formatMeters(inboundLeg.distanceMeters),
              duration: formatSeconds(inboundLeg.durationSeconds),
              unavailable: false,
            },
    };
  });
}

function createRouteGeojson(stops) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { source: "mock" },
        geometry: {
          type: "LineString",
          coordinates: stops.map((stop) => [stop.location.lng, stop.location.lat]),
        },
      },
    ],
  };
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
