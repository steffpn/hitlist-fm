/**
 * Gate for tests that need REAL infrastructure (live Postgres/TimescaleDB,
 * and for some suites Redis). These cannot run against mocks — they create
 * rows, run raw SQL against Timescale catalogs, etc.
 *
 * Opt in explicitly with:
 *   RUN_DB_TESTS=1 npx vitest run
 *
 * Usage in a test file:
 *   import { dbTestsEnabled } from "../helpers/db.js";
 *   describe.runIf(dbTestsEnabled)("My DB suite", () => { ... });
 *
 * Without the flag the suites report as skipped (not failed), so the default
 * `vitest run` stays green on machines/CI without a database.
 */
export const dbTestsEnabled = process.env.RUN_DB_TESTS === "1";
