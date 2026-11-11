/**
 * Catalog artifact masking — shared, environment-agnostic core.
 *
 * The catalog is public data scraped from supplier sites. It is fine for it to
 * be *possible* to extract, but it should not be a file you get by opening a
 * URL. The build masks it; the browser unmasks it. Everything here is
 * symmetric, so a single implementation serves both sides.
 *
 * Wire format (`.dat`):
 *
 *     "TIPCAT6:" + base64( xor( gzip( jsonText ) ) )
 *
 * Why an envelope instead of raw bytes
 *
 *   The previous format wrote `MAGIC + xor(gzip(json))` as binary. Opaque bytes
 *   cannot be compressed by the CDN, so the artifact was stuck at gzip's ratio
 *   forever. Base64 costs ~33% on the wire, which sounds bad until you notice
 *   that *base64 text compresses* — Cloudflare runs Brotli on the response and
 *   recovers most of the overhead, while the visitor still sees alphabet soup.
 *   Text also survives `git`, diffs sanely, and is safe under any content type.
 *
 * Why XOR at all, if the key ships in the bundle
 *
 *   This is not cryptography and must not be described as encryption. XOR with
 *   a key that is baked into the JS bundle can be reversed by anyone willing to
 *   read the bundle for a minute. The point is to change the effort required
 *   from "open a URL" to "study and run the site's code", which is the actual
 *   goal: a naive scraper doing a GET gets nothing usable.
 */

export const CATALOG_MAGIC = "TIPCAT6:"

const encoder = new TextEncoder()

/** Repeating-key XOR. Symmetric: applying it twice returns the input. */
export function xorBytes(bytes: Uint8Array, key: string): Uint8Array<ArrayBuffer> {
  if (!key) throw new Error("Catalog masking key is empty.")
  const keyBytes = encoder.encode(key)
  const out = new Uint8Array(new ArrayBuffer(bytes.length))
  for (let index = 0; index < bytes.length; index += 1) {
    // eslint-disable-next-line security/detect-object-injection -- numeric index into a Uint8Array, not a user-controlled key.
    out[index] = bytes[index] ^ (keyBytes[index % keyBytes.length] ?? 0)
  }
  return out
}

/**
 * `String.fromCharCode(...bytes)` throws RangeError past roughly 100k elements,
 * and the compressed catalog is several hundred thousand bytes, so this feeds
 * the bytes through in chunks instead of spreading them.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = ""
  const CHUNK = 0x8000
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) {
    // eslint-disable-next-line security/detect-object-injection -- numeric index into a Uint8Array, not a user-controlled key.
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Wraps already-compressed bytes into the transport string. */
export function wrapMasked(compressed: Uint8Array, key: string): string {
  return CATALOG_MAGIC + toBase64(xorBytes(compressed, key))
}

/** Unwraps the transport string back to compressed bytes. */
export function unwrapMasked(payload: string, key: string): Uint8Array<ArrayBuffer> {
  if (!payload.startsWith(CATALOG_MAGIC)) {
    throw new Error(
      "The catalog file is not in the expected format. Rebuild it with `npm run catalog:build`."
    )
  }
  return xorBytes(fromBase64(payload.slice(CATALOG_MAGIC.length)), key)
}
