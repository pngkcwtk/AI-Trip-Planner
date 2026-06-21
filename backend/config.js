import dotenv from "dotenv";

dotenv.config();

function normalizeGeminiModel(model) {
  const normalized = String(model || "gemini-2.0-flash")
    .trim()
    .replace(/^models\//i, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "");

  if (normalized === "gemini-25-flash") return "gemini-2.5-flash";
  if (normalized === "gemini-20-flash") return "gemini-2.0-flash";

  return normalized;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  orsApiKey: process.env.ORS_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: normalizeGeminiModel(process.env.GEMINI_MODEL),
};

export function getMissingConfigKeys() {
  const missing = [];

  if (!config.orsApiKey) missing.push("ORS_API_KEY");
  if (!config.geminiApiKey) missing.push("GEMINI_API_KEY");

  return missing;
}
