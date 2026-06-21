const interestOptions = [
  "Nature",
  "Cafe",
  "Temple",
  "Food",
  "Photography",
  "Shopping",
  "Family",
  "History",
];

const thaiProvinces = [
  "กรุงเทพมหานคร",
  "กระบี่",
  "กาญจนบุรี",
  "กาฬสินธุ์",
  "กำแพงเพชร",
  "ขอนแก่น",
  "จันทบุรี",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "ชัยนาท",
  "ชัยภูมิ",
  "ชุมพร",
  "เชียงราย",
  "เชียงใหม่",
  "ตรัง",
  "ตราด",
  "ตาก",
  "นครนายก",
  "นครปฐม",
  "นครพนม",
  "นครราชสีมา",
  "นครศรีธรรมราช",
  "นครสวรรค์",
  "นนทบุรี",
  "นราธิวาส",
  "น่าน",
  "บึงกาฬ",
  "บุรีรัมย์",
  "ปทุมธานี",
  "ประจวบคีรีขันธ์",
  "ปราจีนบุรี",
  "ปัตตานี",
  "พระนครศรีอยุธยา",
  "พะเยา",
  "พังงา",
  "พัทลุง",
  "พิจิตร",
  "พิษณุโลก",
  "เพชรบุรี",
  "เพชรบูรณ์",
  "แพร่",
  "ภูเก็ต",
  "มหาสารคาม",
  "มุกดาหาร",
  "แม่ฮ่องสอน",
  "ยโสธร",
  "ยะลา",
  "ร้อยเอ็ด",
  "ระนอง",
  "ระยอง",
  "ราชบุรี",
  "ลพบุรี",
  "ลำปาง",
  "ลำพูน",
  "เลย",
  "ศรีสะเกษ",
  "สกลนคร",
  "สงขลา",
  "สตูล",
  "สมุทรปราการ",
  "สมุทรสงคราม",
  "สมุทรสาคร",
  "สระแก้ว",
  "สระบุรี",
  "สิงห์บุรี",
  "สุโขทัย",
  "สุพรรณบุรี",
  "สุราษฎร์ธานี",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อ่างทอง",
  "อำนาจเจริญ",
  "อุดรธานี",
  "อุตรดิตถ์",
  "อุทัยธานี",
  "อุบลราชธานี",
];

let leafletMap;
let mapMarkers = [];
let routeLayers = [];

const elements = {
  form: document.querySelector("#tripForm"),
  provinceOptions: document.querySelector("#provinceOptions"),
  interests: document.querySelector("#interests"),
  submitButton: document.querySelector("#submitButton"),
  loadingState: document.querySelector("#loadingState"),
  errorState: document.querySelector("#errorState"),
  emptyState: document.querySelector("#emptyState"),
  dashboard: document.querySelector("#dashboard"),
  totalStops: document.querySelector("#totalStops"),
  totalDistance: document.querySelector("#totalDistance"),
  totalTravelTime: document.querySelector("#totalTravelTime"),
  availableTime: document.querySelector("#availableTime"),
  strategy: document.querySelector("#strategy"),
  sourceNotice: document.querySelector("#sourceNotice"),
  timeline: document.querySelector("#timeline"),
};

document.querySelector("#travelDate").value = new Date().toISOString().slice(0, 10);

renderProvinceOptions();
renderInterestButtons();
elements.form.addEventListener("submit", handleSubmit);

async function handleSubmit(event) {
  event.preventDefault();
  setLoading(true);
  hideError();

  try {
    const preferences = getFormData();
    const response = await fetch("/api/plan-trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to generate itinerary.");
    }

    renderDashboard(data);
    await renderMap(data);
    document.querySelector("#results").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(false);
  }
}

function renderInterestButtons() {
  elements.interests.innerHTML = interestOptions
    .map(
      (interest, index) => `
        <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
          <input class="h-4 w-4 rounded border-slate-300 text-blue-600" type="checkbox" name="interest" value="${interest}" ${index < 3 ? "checked" : ""} />
          <span class="font-medium">${interest}</span>
        </label>
      `,
    )
    .join("");
}

function renderProvinceOptions() {
  elements.provinceOptions.innerHTML = thaiProvinces
    .map((province) => `<option value="${province}"></option>`)
    .join("");
}

function getFormData() {
  return {
    destination: document.querySelector("#destination").value.trim(),
    travelDate: document.querySelector("#travelDate").value,
    startTime: document.querySelector("#startTime").value,
    endTime: document.querySelector("#endTime").value,
    budget: Number(document.querySelector("#budget").value),
    travelers: Number(document.querySelector("#travelers").value),
    interests: [...document.querySelectorAll('input[name="interest"]:checked')].map(
      (input) => input.value,
    ),
  };
}

function renderDashboard(data) {
  elements.emptyState.classList.add("hidden");
  elements.dashboard.classList.remove("hidden");
  elements.totalStops.textContent = data.summary.totalStops;
  elements.totalDistance.textContent = data.summary.totalDistance;
  elements.totalTravelTime.textContent = data.summary.totalTravelTime;
  elements.availableTime.textContent = data.summary.availableTime;
  elements.strategy.textContent = data.aiPlan.strategy;
  renderSourceNotice(data);
  elements.timeline.innerHTML = data.itinerary.map(renderStop).join("");
}

function renderSourceNotice(data) {
  if (data.source === "mock-khon-kaen") {
    elements.sourceNotice.textContent = `Using Khon Kaen mock data. Reason: ${data.aiPlan.reason}`;
    elements.sourceNotice.classList.remove("hidden");
    return;
  }

  elements.sourceNotice.classList.add("hidden");
  elements.sourceNotice.textContent = "";
}

function renderStop(stop) {
  const travel = stop.travelFromPrevious
    ? `
      <div class="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        Travel from previous: <strong>${stop.travelFromPrevious.duration}</strong> &middot; <strong>${stop.travelFromPrevious.distance}</strong>
      </div>
    `
    : "";

  return `
    <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      ${travel}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm font-bold text-blue-600">${stop.arrivalTime} - ${stop.departureTime}</p>
          <h3 class="mt-1 text-xl font-bold">${stop.order}. ${escapeHtml(stop.name)}</h3>
          <p class="mt-1 text-sm text-slate-500">${escapeHtml(stop.type)} &middot; ${escapeHtml(stop.address)}</p>
        </div>
      </div>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          <p class="font-semibold">Opening status</p>
          <p>${escapeHtml(stop.openStatus)}</p>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p class="font-semibold">Links</p>
          <p>
            ${stop.osmUrl ? `<a class="text-blue-600 underline" target="_blank" rel="noreferrer" href="${stop.osmUrl}">OpenStreetMap</a>` : "OpenStreetMap link unavailable"}
            ${stop.websiteUri ? ` &middot; <a class="text-blue-600 underline" target="_blank" rel="noreferrer" href="${stop.websiteUri}">Website</a>` : ""}
          </p>
        </div>
      </div>
    </article>
  `;
}

async function renderMap(data) {
  const mapElement = document.querySelector("#map");

  if (!window.L) {
    mapElement.innerHTML =
      '<div class="grid h-full place-items-center p-6 text-center text-slate-500">Leaflet could not load. Check your internet connection and reload the page.</div>';
    return;
  }

  clearMap();

  const center = data.map.center || data.itinerary[0]?.location || {
    lat: 13.7563,
    lng: 100.5018,
  };

  if (!leafletMap) {
    leafletMap = L.map(mapElement, {
      scrollWheelZoom: true,
    }).setView([center.lat, center.lng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(leafletMap);
  } else {
    leafletMap.setView([center.lat, center.lng], 12);
  }

  data.map.markers.forEach((marker) => {
    const position = marker.location;
    const leafletMarker = L.marker([position.lat, position.lng], {
      title: marker.name,
    })
      .addTo(leafletMap)
      .bindPopup(`<strong>${escapeHtml(marker.label)}. ${escapeHtml(marker.name)}</strong>`);
    mapMarkers.push(leafletMarker);
  });

  const geojsonRoutes = data.map.legGeojson?.length
    ? data.map.legGeojson
    : [data.map.routeGeojson].filter(Boolean);

  geojsonRoutes.forEach((geojson) => {
    const layer = L.geoJSON(geojson, {
      style: {
        color: "#2563eb",
        opacity: 0.9,
        weight: 5,
      },
    }).addTo(leafletMap);
    routeLayers.push(layer);
  });

  if (mapMarkers.length > 1) {
    const markerBounds = L.latLngBounds(mapMarkers.map((marker) => marker.getLatLng()));
    leafletMap.fitBounds(markerBounds, { padding: [40, 40] });
  }
}

function clearMap() {
  mapMarkers.forEach((marker) => marker.remove());
  routeLayers.forEach((layer) => layer.remove());
  mapMarkers = [];
  routeLayers = [];
}

function setLoading(isLoading) {
  elements.submitButton.disabled = isLoading;
  elements.submitButton.textContent = isLoading
    ? "Generating itinerary..."
    : "Generate full-day itinerary";
  elements.loadingState.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  elements.errorState.textContent = message;
  elements.errorState.classList.remove("hidden");
}

function hideError() {
  elements.errorState.classList.add("hidden");
  elements.errorState.textContent = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
