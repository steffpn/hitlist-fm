/**
 * Canonical artist-name normalization for the identity model.
 *
 * `Artist.nameNormalized` is the unique merge key for canonical artists
 * (claim flow, /artists/search, backfill dedup). This function is the
 * TypeScript twin of the pure-SQL expression used by the
 * 20260702200000_identity_foundation backfill migration:
 *
 *   trim(regexp_replace(
 *       lower(translate(name, 'ăâîșțĂÂÎȘȚşţŞŢ', 'aaistAAISTstST')),
 *       '\s+', ' ', 'g'))
 *
 * Postgres has no guaranteed `unaccent` extension in this deployment (no
 * migration ever ran CREATE EXTENSION), so the SQL side only folds the
 * Romanian diacritics — both the correct comma-below forms (ă â î ș ț) and
 * the legacy cedilla forms (ş ţ). This TS implementation uses NFKD
 * decomposition + combining-mark stripping, which folds those exact
 * characters identically and additionally covers non-Romanian accents
 * (é, ü, ñ, ...) — a strict superset, so TS and SQL agree on all
 * Romanian-locale data. Going forward this function is the single source
 * of truth (all new rows are written through it).
 *
 * Steps:
 *   1. Unicode NFKD decomposition (ș -> s + U+0326, é -> e + U+0301, ...)
 *   2. Strip combining diacritical marks (U+0300–U+036F)
 *   3. Lowercase
 *   4. Collapse runs of whitespace to a single space
 *   5. Trim
 */
export function normalizeArtistName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
