/**
 * Shrink a photograph before it is sent to be read.
 *
 * A phone camera produces a 3-5 MB, 12-megapixel JPEG. Prescription Lens was
 * posting that file byte for byte, and it cost on both ends: the request is
 * larger than a Vercel function will accept (~4.5 MB of body, and base64 adds
 * a third), and the model spends far longer on the pixels than it needs to.
 * Measured against the same prescription, a 232 KB image read in 2.7-19s
 * depending on model; a full-size phone photo does not finish inside the
 * function's budget at all, so every model in the chain times out and the
 * whole scan fails with "could not read that image".
 *
 * A prescription is text on paper. At 1600px on the long edge the writing is
 * still comfortably legible - that is roughly 200 dpi across an A5 script -
 * and the file lands around a quarter of a megabyte. Nothing about the read
 * gets worse; everything about the round trip gets better.
 */

/** Long edge, in pixels, after shrinking. */
export const MAX_EDGE = 1600;

/**
 * What the encoded image should come in under.
 *
 * Base64 inflates by 4/3, so this leaves the request body around 1.2 MB -
 * comfortably inside the platform limit even with the rest of the payload.
 */
export const TARGET_BYTES = 900_000;

/** Quality steps tried in order until the file is small enough. */
const QUALITY_STEPS = [0.82, 0.7, 0.6];

export type PreparedImage = {
  base64: string;
  mimeType: string;
  /** Bytes actually sent, for logging and for the caller's own guard. */
  bytes: number;
  /** False when the browser could not decode the file and it was sent as-is. */
  resized: boolean;
};

/**
 * The size an image becomes when its long edge is capped.
 *
 * Aspect ratio is preserved and an image already inside the cap is left alone -
 * upscaling a small photo would add bytes without adding legibility.
 */
export function fitWithin(
  width: number, height: number, maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Blob -> bare base64, without the `data:` prefix the API rejects. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const comma = raw.indexOf(",");
      resolve(comma >= 0 ? raw.slice(comma + 1) : raw);
    };
    reader.readAsDataURL(blob);
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));
}

/**
 * Decode, shrink and re-encode a photo for sending.
 *
 * Falls back to the original bytes whenever the browser cannot decode the file
 * - HEIC outside Safari is the usual case - so an unusual format still gets a
 * chance at being read rather than being refused locally.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const asIs = async (): Promise<PreparedImage> => ({
    base64: await toBase64(file),
    mimeType: file.type || "image/jpeg",
    bytes: file.size,
    resized: false,
  });

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return asIs();

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation a phone records instead of rotating
    // the pixels, so a portrait photo is not handed over sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return asIs();
  }

  try {
    let edge = MAX_EDGE;
    for (let attempt = 0; attempt < 3; attempt++) {
      const size = fitWithin(bitmap.width, bitmap.height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return asIs();
      // White underneath: a PNG with transparency would otherwise flatten to
      // black and take the writing with it.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.drawImage(bitmap, 0, 0, size.width, size.height);

      for (const quality of QUALITY_STEPS) {
        const blob = await encode(canvas, quality);
        if (!blob) return asIs();
        if (blob.size <= TARGET_BYTES || quality === QUALITY_STEPS[QUALITY_STEPS.length - 1]) {
          if (blob.size <= TARGET_BYTES) {
            return { base64: await toBase64(blob), mimeType: "image/jpeg", bytes: blob.size, resized: true };
          }
          break; // still too big at the lowest quality - shrink the edge instead
        }
      }
      edge = Math.round(edge * 0.75);
    }

    // Three passes and still large: send the smallest encode rather than fail.
    const size = fitWithin(bitmap.width, bitmap.height, edge);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return asIs();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await encode(canvas, 0.55);
    if (!blob) return asIs();
    return { base64: await toBase64(blob), mimeType: "image/jpeg", bytes: blob.size, resized: true };
  } finally {
    bitmap.close?.();
  }
}
