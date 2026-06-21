import { config } from "../config.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export async function generateSearchPlan(preferences) {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const prompt = `
You are an itinerary planning assistant. Convert the travel preferences into OpenStreetMap/Nominatim search keywords.

Return strict JSON only with this shape:
{
  "keywords": ["keyword in destination"],
  "strategy": "short practical planning strategy",
  "paceMinutesPerStop": 75
}

Rules:
- Use the destination in each keyword.
- Include a mix of the user's interests.
- Avoid hotel, airport, and generic transportation searches.
- Return 6 to 10 keywords.
- paceMinutesPerStop should fit the available time, budget, travelers, and interests.

Preferences:
${JSON.stringify(preferences, null, 2)}
`;

  const text = await requestGemini(config.geminiModel, prompt);

  return normalizeSearchPlan(JSON.parse(text), preferences);
}

async function requestGemini(model, prompt) {
  let response;
  try {
    response = await fetch(
      `${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.4,
          },
        }),
      },
    );
  } catch (error) {
    throw new Error(
      `Gemini API network request failed: ${
        error instanceof Error ? error.message : "Unknown network error"
      }`,
    );
  }

  if (!response.ok) {
    const message = await readProviderError(response);
    if (response.status === 503 && model !== "gemini-2.0-flash") {
      return requestGemini("gemini-2.0-flash", prompt);
    }

    throw new Error(`Gemini API failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty planning response.");
  }

  return text;
}

async function readProviderError(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return data?.error?.message ?? text;
  } catch {
    return text;
  }
}

function normalizeSearchPlan(plan, preferences) {
  const destination = preferences.destination;
  const fallbackKeywords = preferences.interests.map(
    (interest) => `${interest} attractions in ${destination}`,
  );
  const keywords = Array.isArray(plan.keywords) ? plan.keywords : [];

  return {
    keywords: [...new Set([...keywords, ...fallbackKeywords])]
      .filter(Boolean)
      .slice(0, 10),
    strategy:
      typeof plan.strategy === "string"
        ? plan.strategy
        : "Balance real place quality, travel time, and the user's interests.",
    paceMinutesPerStop:
      Number.isFinite(plan.paceMinutesPerStop) && plan.paceMinutesPerStop > 30
        ? Math.min(Number(plan.paceMinutesPerStop), 150)
        : 75,
  };
}
