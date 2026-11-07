/**
 * Bumped whenever the shape of the catalog artifact changes.
 *
 * v6: masked `.dat` — "TIPCAT6:" + base64(xor(gzip(json))).
 *     v5 shipped plain JSON, which made the catalog a file anyone could read
 *     with curl. Masking is required by the product owner: the data may be
 *     public, but it must not be trivial to harvest.
 *     v4 and earlier were binary magic+xor+gzip; the binary form could not be
 *     compressed by the CDN at all. v6 keeps the mask and makes the payload
 *     text, so Brotli still applies.
 */
export const CATALOG_FORMAT = 6
/** Sentinel for "no value" in dictionary indexes and prices. */
export const NO_VALUE = -1
export const PAGE_SIZE = 25
export const RESULTS_ANCHOR_ID = "catalog-results"
