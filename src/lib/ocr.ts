/** On-device OCR (tesseract.js, loaded on demand). Output is a guess: a human always confirms. */
export async function ocrImage(blob: Blob, onProgress?: (p: number) => void, timeoutMs = 75_000): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => { if (m.status === "recognizing text") onProgress?.(m.progress); },
  });
  try {
    const result = await Promise.race([
      worker.recognize(blob),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("OCR timed out")), timeoutMs)),
    ]);
    return result.data.text;
  } finally {
    await worker.terminate().catch(() => {});
  }
}
