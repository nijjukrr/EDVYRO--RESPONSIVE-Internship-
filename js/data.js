import { getApiEndpoint } from "./config.js";
import { validateDataset } from "./validation.js";

export const DEFAULT_API_ENDPOINT = getApiEndpoint("/internships");
export const STATIC_FALLBACK_URL = "./data/internships.json";

/**
 * Fetches and validates internship records from the API endpoint.
 * Gracefully handles loading, server errors, and static fallback for GitHub Pages.
 * @param {string} [targetUrl]
 * @returns {Promise<{ internships: object[], warnings: string[], sourceUrl: string }>}
 */
export async function loadInternships(targetUrl = DEFAULT_API_ENDPOINT) {
  let response;

  try {
    response = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error("[InternBoard] Network error connecting to internship API:", {
      targetUrl,
      error: networkError,
    });

    // On GitHub Pages static hosting where no backend process is running, fall back to verified dataset
    if (
      typeof window !== "undefined" &&
      window.location.hostname.endsWith("github.io") &&
      targetUrl !== STATIC_FALLBACK_URL
    ) {
      console.warn("[InternBoard] GitHub Pages static host detected; loading verified dataset.");
      return loadInternships(STATIC_FALLBACK_URL);
    }

    throw new Error(
      `Unable to connect to the internship API at ${targetUrl}. Please ensure the backend server is running (npm start in /backend) or click Retry.`
    );
  }

  if (!response.ok) {
    console.error("[InternBoard] Non-OK HTTP status from API:", {
      targetUrl,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(
      `API returned HTTP ${response.status} (${response.statusText}).`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    console.error("[InternBoard] Failed to parse API JSON response:", {
      targetUrl,
      error: parseError,
    });
    throw new Error("API returned invalid JSON that could not be parsed.");
  }

  const { internships, warnings } = validateDataset(payload);

  if (warnings.length > 0) {
    console.warn("[InternBoard] Dataset validation warnings:", warnings);
  }

  return {
    internships,
    warnings,
    sourceUrl: targetUrl,
  };
}
