export type DatasetErrorCode =
  | "ABORTED"
  | "CHECKSUM_MISMATCH"
  | "HTTP_STATUS"
  | "INVALID_JSON"
  | "INVALID_SCHEMA"
  | "NETWORK"
  | "UNSUPPORTED_SCHEMA";

interface DatasetErrorOptions {
  assetPath: string;
  cause?: unknown;
  status?: number;
}

export class DatasetError extends Error {
  readonly assetPath: string;
  override readonly cause?: unknown;
  readonly code: DatasetErrorCode;
  readonly status?: number;

  constructor(
    code: DatasetErrorCode,
    message: string,
    options: DatasetErrorOptions,
  ) {
    super(message);
    this.name = "DatasetError";
    this.code = code;
    this.assetPath = options.assetPath;
    this.status = options.status;
    this.cause = options.cause;
  }
}
