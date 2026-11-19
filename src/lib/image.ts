export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
/** Storage bucket limit is 8 MiB; stay below it. */
export const MAX_BYTES = 8 * 1024 * 1024 - 1024;

async function drawToJpeg(src: Blob, maxSide: number, quality: number, grayscale = false): Promise<Blob> {
  const bmp = await createImageBitmap(src);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  if (grayscale) ctx.filter = "grayscale(1) contrast(1.25)";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode image"))), "image/jpeg", quality));
}

/**
 * Keep the ORIGINAL bytes whenever possible: the ledger fingerprints the exact file, so anyone who
 * later receives this same file can verify it. Only re-encode if the type is unsupported or too big.
 */
export async function prepareForUpload(file: File): Promise<{ blob: Blob; mime: string }> {
  if (ALLOWED_MIME.includes(file.type) && file.size <= MAX_BYTES) return { blob: file, mime: file.type };
  for (const q of [0.88, 0.8, 0.7, 0.6]) {
    const b = await drawToJpeg(file, 3000, q);
    if (b.size <= MAX_BYTES) return { blob: b, mime: "image/jpeg" };
  }
  throw new Error("This photo is too large. Try again with a lower camera resolution.");
}

/** A smaller, higher-contrast copy used only for OCR (never uploaded or hashed). */
export const prepareForOcr = (blob: Blob) => drawToJpeg(blob, 1800, 0.9, true);
