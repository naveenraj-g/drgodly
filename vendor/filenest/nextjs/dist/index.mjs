// ../core/dist/index.mjs
var FileNestError = class extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = "FileNestError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var AuthenticationError = class extends FileNestError {
  constructor(message = "Invalid or missing API key") {
    super(message, "authentication_required", 401);
    this.name = "AuthenticationError";
  }
};
var AuthorizationError = class extends FileNestError {
  constructor(message = "Insufficient scope", requiredScope) {
    super(message, "insufficient_scope", 403);
    this.name = "AuthorizationError";
    this.requiredScope = requiredScope;
  }
};
var NotFoundError = class extends FileNestError {
  constructor(message = "Resource not found") {
    super(message, "not_found", 404);
    this.name = "NotFoundError";
  }
};
var FileNotFoundError = class extends NotFoundError {
  constructor(fileId) {
    super(fileId ? `File ${fileId} not found` : "File not found");
    this.name = "FileNotFoundError";
    this.fileId = fileId;
  }
};
var ConflictError = class extends FileNestError {
  constructor(message = "Resource conflict") {
    super(message, "conflict", 409);
    this.name = "ConflictError";
  }
};
var WORMViolationError = class extends FileNestError {
  constructor(message = "File is WORM-committed and cannot be modified") {
    super(message, "worm_violation", 409);
    this.name = "WORMViolationError";
  }
};
var LegalHoldError = class extends FileNestError {
  constructor(message = "File is under legal hold", reason) {
    super(message, "legal_hold_active", 409);
    this.name = "LegalHoldError";
    this.reason = reason;
  }
};
var ValidationError = class extends FileNestError {
  constructor(message = "Validation failed", validationErrors = [], code = "validation_error") {
    super(message, code, 422);
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
};
var MetadataValidationError = class extends ValidationError {
  constructor(validationErrors = []) {
    super("Metadata validation failed", validationErrors, "metadata_validation_error");
    this.name = "MetadataValidationError";
  }
};
var RateLimitError = class extends FileNestError {
  constructor(message = "Rate limit exceeded", retryAfter) {
    super(message, "rate_limited", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var NetworkError = class extends FileNestError {
  constructor(message = "Network error", cause) {
    super(message, "network_error", 0);
    this.name = "NetworkError";
    this.cause = cause;
  }
};
var StorageError = class extends FileNestError {
  constructor(message = "Storage provider error") {
    super(message, "storage_error", 502);
    this.name = "StorageError";
  }
};
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelizeKeys(value) {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        snakeToCamel(k),
        camelizeKeys(v)
      ])
    );
  }
  return value;
}
var DEFAULT_BASE_URL = "https://api.filenest.io";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_MAX_RETRIES = 3;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function mapResponseError(status, response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
  }
  const err = body.error ?? {};
  const message = err.message ?? response.statusText;
  switch (status) {
    case 401:
      throw new AuthenticationError(message);
    case 403:
      throw new AuthorizationError(message, err.required_scope);
    case 404: {
      throw new NotFoundError(message);
    }
    case 409:
      if (err.code === "worm_violation") throw new WORMViolationError(message);
      if (err.code === "legal_hold_active") throw new LegalHoldError(message);
      throw new ConflictError(message);
    case 422:
      if (err.code === "metadata_validation_error") {
        throw new MetadataValidationError(err.validation_errors ?? []);
      }
      throw new ValidationError(message, err.validation_errors ?? []);
    case 429:
      throw new RateLimitError(message, err.retry_after);
    default:
      throw new FileNestError(message, err.code ?? "server_error", status);
  }
}
var FileNestHttpClient = class {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.projectId = config.projectId;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...config.apiVersion ? { "FileNest-Version": config.apiVersion } : {}
    };
  }
  url(path) {
    return `${this.baseUrl}${path}`;
  }
  async fetchWithRetry(url, init, attempt = 0) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status >= 500 && attempt < this.maxRetries) {
        await sleep(Math.min(1e3 * 2 ** attempt, 8e3));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new NetworkError(`Request timed out after ${this.timeout}ms`);
      }
      if (attempt < this.maxRetries) {
        await sleep(Math.min(1e3 * 2 ** attempt, 8e3));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw new NetworkError("Network request failed", err);
    }
  }
  async get(path, params) {
    const url = new URL(this.url(path));
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== void 0) url.searchParams.set(k, String(v));
      }
    }
    const res = await this.fetchWithRetry(url.toString(), { method: "GET", headers: this.headers });
    if (!res.ok) await mapResponseError(res.status, res);
    return camelizeKeys(await res.json());
  }
  async post(path, body) {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "POST",
      headers: this.headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!res.ok) await mapResponseError(res.status, res);
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return void 0;
    }
    return camelizeKeys(await res.json());
  }
  async patch(path, body) {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "PATCH",
      headers: this.headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (!res.ok) await mapResponseError(res.status, res);
    return camelizeKeys(await res.json());
  }
  async delete(path) {
    const res = await this.fetchWithRetry(this.url(path), {
      method: "DELETE",
      headers: this.headers
    });
    if (!res.ok) await mapResponseError(res.status, res);
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return void 0;
    }
    return camelizeKeys(await res.json());
  }
  /** Raw fetch for binary/multipart use cases (upload, streaming download). */
  async rawFetch(path, init) {
    const res = await this.fetchWithRetry(this.url(path), {
      ...init,
      headers: { Authorization: `Bearer ${this.apiKey}`, ...init.headers }
    });
    if (!res.ok) await mapResponseError(res.status, res);
    return res;
  }
};
export {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  FileNestError,
  FileNestHttpClient,
  FileNotFoundError,
  LegalHoldError,
  MetadataValidationError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  StorageError,
  ValidationError,
  WORMViolationError
};
//# sourceMappingURL=index.mjs.map