export type Sha256Checksum = `sha256:${string}`;

export async function sha256(bytes: Uint8Array): Promise<Sha256Checksum> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    Uint8Array.from(bytes).buffer,
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `sha256:${hex}`;
}

export async function matchesChecksum(
  bytes: Uint8Array,
  expected: Sha256Checksum,
): Promise<boolean> {
  return (await sha256(bytes)) === expected;
}
