/**
 * Shared Deezer public API helpers.
 *
 * Deezer's public API requires no auth for these read-only endpoints.
 * All helpers are best-effort: network or API errors resolve to null
 * rather than throwing, so callers can treat artwork/pictures as optional
 * metadata and never block core processing on Deezer availability.
 */

const DEEZER_API_BASE = "https://api.deezer.com";

/** GET a Deezer API URL and parse JSON. Returns null on any failure. */
export async function deezerFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface DeezerTrack {
  id?: number;
  album?: { cover_medium?: string; cover_big?: string };
  // Deezer returns 200 with an `error` body for unknown ISRCs
  error?: unknown;
}

/**
 * Resolve album artwork (cover_medium) via exact ISRC lookup.
 * https://api.deezer.com/2.0/track/isrc:{isrc}
 */
export async function fetchArtworkByIsrc(isrc: string): Promise<string | null> {
  const track = await deezerFetch<DeezerTrack>(
    `${DEEZER_API_BASE}/2.0/track/isrc:${encodeURIComponent(isrc)}`,
  );
  return track?.album?.cover_medium ?? null;
}

/**
 * Resolve album artwork via title+artist track search.
 * Fallback for events without an ISRC (or ISRCs unknown to Deezer).
 */
export async function fetchArtworkBySearch(
  title: string,
  artist: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    q: `track:"${title}" artist:"${artist}"`,
    limit: "1",
  });
  const result = await deezerFetch<{ data?: DeezerTrack[] }>(
    `${DEEZER_API_BASE}/search/track?${params}`,
  );
  return result?.data?.[0]?.album?.cover_medium ?? null;
}

/**
 * Artwork lookup: ISRC first (exact), title+artist search as fallback.
 * Returns null when Deezer has no match or is unreachable.
 */
export async function lookupArtwork(
  isrc: string | null,
  title: string,
  artist: string,
): Promise<string | null> {
  if (isrc) {
    const byIsrc = await fetchArtworkByIsrc(isrc);
    if (byIsrc) return byIsrc;
  }
  return fetchArtworkBySearch(title, artist);
}

/** Resolve an artist's profile picture (picture_medium) by name. */
export async function fetchArtistPicture(
  artistName: string,
): Promise<string | null> {
  const params = new URLSearchParams({ q: artistName, limit: "1" });
  const result = await deezerFetch<{
    data?: Array<{ picture_medium?: string }>;
  }>(`${DEEZER_API_BASE}/search/artist?${params}`);
  return result?.data?.[0]?.picture_medium ?? null;
}
