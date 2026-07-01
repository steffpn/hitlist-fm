import { describe, it, expect } from "vitest";
import { normalizeArtistName } from "../../src/lib/artist-name.js";

/**
 * normalizeArtistName is the TS twin of the SQL normalization used by the
 * identity_foundation backfill migration:
 *   trim(regexp_replace(
 *       lower(translate(name, 'ăâîșțĂÂÎȘȚşţŞŢ', 'aaistAAISTstST')),
 *       '\s+', ' ', 'g'))
 * These tests pin the exact behavior both sides must agree on (Romanian
 * diacritics, case, whitespace), plus the TS-only superset (any accents).
 */
describe("normalizeArtistName", () => {
  it("lowercases plain ASCII names", () => {
    expect(normalizeArtistName("Smiley")).toBe("smiley");
    expect(normalizeArtistName("INNA")).toBe("inna");
  });

  it("strips Romanian comma-below diacritics (ă â î ș ț)", () => {
    expect(normalizeArtistName("Ștefan Bănică")).toBe("stefan banica");
    expect(normalizeArtistName("Anca Țurcașiu")).toBe("anca turcasiu");
    expect(normalizeArtistName("Câmpeanu")).toBe("campeanu");
    expect(normalizeArtistName("Îndrăgostiți")).toBe("indragostiti");
  });

  it("strips legacy cedilla forms (ş ţ) identically to comma-below forms", () => {
    // U+015F/U+0163 (cedilla) vs U+0219/U+021B (comma below) must merge
    expect(normalizeArtistName("Ştefan")).toBe(normalizeArtistName("Ștefan"));
    expect(normalizeArtistName("ţară")).toBe(normalizeArtistName("țară"));
    expect(normalizeArtistName("Şatra Benz")).toBe("satra benz");
  });

  it("strips uppercase Romanian diacritics (Ă Â Î Ș Ț)", () => {
    expect(normalizeArtistName("ȚARA")).toBe("tara");
    expect(normalizeArtistName("ĂÂÎȘȚ")).toBe("aaist");
  });

  it("strips non-Romanian accents (TS superset over the SQL backfill)", () => {
    expect(normalizeArtistName("Beyoncé")).toBe("beyonce");
    expect(normalizeArtistName("Måneskin")).toBe("maneskin");
    expect(normalizeArtistName("Señorita")).toBe("senorita");
  });

  it("collapses runs of whitespace and trims", () => {
    expect(normalizeArtistName("  Carla's   Dreams  ")).toBe("carla's dreams");
    expect(normalizeArtistName("The\t Motans\n")).toBe("the motans");
  });

  it("merges the same artist written with and without diacritics", () => {
    // The exact merge the backfill relies on: MonitoredSong "Delia Matache"
    // vs LabelArtist "Delia Matache" with diacritics must be one Artist.
    expect(normalizeArtistName("Bănică")).toBe(normalizeArtistName("Banica"));
    expect(normalizeArtistName("IRIȘ")).toBe(normalizeArtistName("iris"));
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeArtistName("   ")).toBe("");
    expect(normalizeArtistName("")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalizeArtistName("Ștefan  Bănică Jr.");
    expect(normalizeArtistName(once)).toBe(once);
  });
});
