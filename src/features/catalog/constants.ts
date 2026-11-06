/**
 * Bumped whenever the shape of the catalog artifact changes.
 *
 * v5: plain JSON (no gzip wrapper, no XOR mask). The CDN and the browser
 *     handle compression; serving compressible JSON is what lets Cloudflare
 *     apply Brotli (the old pre-gzipped, XOR-masked file was opaque bytes and
 *     could not be compressed any further).
 */
export const CATALOG_FORMAT = 5
/** Sentinel for "no value" in dictionary indexes and prices. */
export const NO_VALUE = -1
export const PAGE_SIZE = 25
export const RESULTS_ANCHOR_ID = "catalog-results"
