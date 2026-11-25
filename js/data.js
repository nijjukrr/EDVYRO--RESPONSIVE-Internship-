import { getApiEndpoint, getStaticDatasetUrl } from "./config.js";
import { validateDataset } from "./validation.js";

export const STATIC_FALLBACK_URL = getStaticDatasetUrl();
export const DEFAULT_API_ENDPOINT = getApiEndpoint("/internships") || STATIC_FALLBACK_URL;

/**
 * Determines the appropriate internship data source URL and source type for the active environment.
 * @param {string | null} [explicitUrl]
 * @param {Location | { hostname?: string, pathname?: string, port?: string }} [loc]
 * @returns {{ url: string, sourceType: "api" | "static" }}
 */
export function resolveDataSource(explicitUrl = null, loc = typeof window !== "undefined" ? window.location : undefined) {
  if (typeof explicitUrl === "string" && explicitUrl.trim()) {
    const cleanUrl = explicitUrl.trim();
    const isStaticFile = cleanUrl.endsWith("/data/internships.json") || cleanUrl === "./data/internships.json";
    return {
      url: cleanUrl,
      sourceType: isStaticFile ? "static" : "api",
    };
  }

  const apiEndpoint = getApiEndpoint("/internships", loc);
  if (apiEndpoint) {
    return {
      url: apiEndpoint,
      sourceType: "api",
    };
  }

  return {
    url: getStaticDatasetUrl(loc),
    sourceType: "static",
  };
}

/**
 * Fetches and validates internship records from either the configured Express API
 * or the repository static dataset (when running on GitHub Pages without a backend).
 * @param {string | null} [targetUrl]
 * @returns {Promise<{ internships: object[], warnings: string[], sourceUrl: string, sourceType: "api" | "static" }>}
 */
export async function loadInternships(targetUrl = null) {
  const { url, sourceType } = resolveDataSource(targetUrl);
  const sourceLabel = sourceType === "static" ? "Static dataset" : "API";

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error(`[InternBoard] Network error connecting to ${sourceLabel}:`, {
      url,
      error: networkError,
    });

    if (sourceType === "static") {
      throw new Error(
        `Unable to load the verified internship dataset from ${url}. Please check your network connection and click Retry.`
      );
    }

    throw new Error(
      `Unable to connect to the internship API at ${url}. Please ensure the backend server is running (npm start in /backend) or click Retry.`
    );
  }

  if (!response.ok) {
    console.error(`[InternBoard] Non-OK HTTP status from ${sourceLabel}:`, {
      url,
      status: response.status,
      statusText: response.statusText,
    });
    const statusDetail = response.statusText ? ` (${response.statusText})` : "";
    throw new Error(`${sourceLabel} returned HTTP ${response.status}${statusDetail}.`);
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch (readError) {
    console.error(`[InternBoard] Failed to read response body from ${sourceLabel}:`, {
      url,
      error: readError,
    });
    throw new Error(`${sourceLabel} response could not be read.`);
  }

  if (!rawText || !rawText.trim()) {
    throw new Error(`${sourceLabel} returned an empty response.`);
  }

  let payload;
  try {
    payload = JSON.parse(rawText);
  } catch (parseError) {
    console.error(`[InternBoard] Failed to parse JSON from ${sourceLabel}:`, {
      url,
      error: parseError,
    });
    throw new Error(`${sourceLabel} returned invalid JSON that could not be parsed.`);
  }

  const { internships, warnings } = validateDataset(payload);

  if (warnings.length > 0) {
    console.warn("[InternBoard] Dataset validation warnings:", warnings);
  }

  return {
    internships,
    warnings,
    sourceUrl: url,
    sourceType,
  };
}
