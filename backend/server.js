import path from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { config, getMissingConfigKeys } from "./config.js";
import { generateItinerary, normalizePreferences } from "./services/itinerary.service.js";
import {
  generateKhonKaenMockItinerary,
  isKhonKaenDestination,
} from "./services/mockKhonKaen.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "../frontend");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(express.static(frontendDir));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    missingConfig: getMissingConfigKeys(),
  });
});

app.post("/api/plan-trip", async (request, response) => {
  try {
    const preferences = normalizePreferences(request.body);
    const missingConfig = getMissingConfigKeys();
    if (missingConfig.length > 0) {
      if (isKhonKaenDestination(preferences.destination)) {
        return response.json(
          generateKhonKaenMockItinerary(
            preferences,
            `Missing environment variables: ${missingConfig.join(", ")}`,
          ),
        );
      }

      return response.status(500).json({
        message: `Missing required environment variables: ${missingConfig.join(", ")}`,
      });
    }

    const itinerary = await generateItinerary(preferences);
    response.json(itinerary);
  } catch (error) {
    try {
      const preferences = normalizePreferences(request.body);
      if (isKhonKaenDestination(preferences.destination)) {
        return response.json(
          generateKhonKaenMockItinerary(
            preferences,
            error instanceof Error ? error.message : "External API failure",
          ),
        );
      }
    } catch {
      // Keep the original error response when request validation fails.
    }

    response.status(400).json({
      message: error instanceof Error ? error.message : "Unable to generate itinerary.",
    });
  }
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(frontendDir, "index.html"));
});

app.listen(config.port, () => {
  console.log(`AI Trip Planner running at http://localhost:${config.port}`);
});
