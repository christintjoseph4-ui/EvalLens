export const supportedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
]);

export const supportedExtensions = ["pdf", "jpg", "jpeg", "png", "webp"];

function readMaxUploadMb() {
  const configured = Number(process.env.MAX_UPLOAD_MB);
  return Number.isFinite(configured) && configured > 0 ? configured : 20;
}

export const maxUploadFileSizeBytes = readMaxUploadMb() * 1024 * 1024;

export const maxUploadPageCount = 20;

export function isSupportedUploadType(type: string) {
  return supportedMimeTypes.has(type);
}

export function formatSupportedUploadTypes() {
  return supportedExtensions.map((extension) => extension.toUpperCase()).join(", ");
}

export function isSupportedFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return Boolean(extension && supportedExtensions.includes(extension));
}

export function bytesToMegabytes(size: number) {
  return Math.round((size / (1024 * 1024)) * 10) / 10;
}

export function estimatePdfPageCount(buffer: Buffer) {
  const head = buffer.subarray(0, Math.min(buffer.length, 2_000_000)).toString("latin1");
  const matches = head.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? null;
}
