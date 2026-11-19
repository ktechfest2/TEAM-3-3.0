/** SHA-256 of the exact bytes of a Blob/File, as lowercase hex (64 chars). */
export async function sha256Hex(data: Blob | ArrayBuffer | Uint8Array): Promise<string> {
  let buf: ArrayBuffer;
  if (data instanceof Blob) buf = await data.arrayBuffer();
  else if (data instanceof Uint8Array) buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  else buf = data;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const SHA256_RE = /^[0-9a-f]{64}$/;
export const isSha256 = (s: string) => SHA256_RE.test(s);
