import { validateDataset } from "./validation.js";

export const DEFAULT_DATA_URL = "./data/internships.json";

/**
 * Fetches and validates internship records from the JSON data source.
 * Logs diagnostic details to the console if loading or validation fails.
 * @param {string} [dataUrl=DEFAULT_DATA_URL]
 * @returns {Promise<{ internships: object[], warnings: string[], sourceUrl: string }>}
 */
export async function loadInternships(dataUrl = DEFAULT_DATA_URL) {
  let response;

  try {
    response = await fetch(dataUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (networkError) {
    console.error("[InternBoard] Network error while fetching internship dataset:", {
      dataUrl,
      error: networkError,
    });
    throw new Error(
      "Unable to load internship data. Please check your connection or run the site over a local HTTP server."
    );
  }

  if (!response.ok) {
    console.error("[InternBoard] Non-OK HTTP status while loading dataset:", {
      dataUrl,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(
      `Failed to load internship records (HTTP ${response.status} ${response.statusText}).`
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch (parseError) {
    console.error("[InternBoard] Failed to parse internship JSON:", {
      dataUrl,
      error: parseError,
    });
    throw new Error("Internship dataset contains invalid JSON and could not be parsed.");
  }

  const { internships, warnings } = validateDataset(payload);

  if (warnings.length > 0) {
    console.warn("[InternBoard] Dataset validation warnings:", warnings);
  }

  return {
    internships,
    warnings,
    sourceUrl: dataUrl,
  };
}
