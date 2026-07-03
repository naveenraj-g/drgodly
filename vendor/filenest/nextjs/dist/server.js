"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/index.ts
var server_exports = {};
__export(server_exports, {
  FileNest: () => FileNest,
  createUploadToken: () => createUploadToken,
  filenestServer: () => filenestServer,
  parseWebhookEvent: () => parseWebhookEvent,
  verifyWebhookSignature: () => verifyWebhookSignature
});
module.exports = __toCommonJS(server_exports);
var import_server_only = require("server-only");
var import_crypto3 = require("crypto");

// ../node/dist/index.mjs
var import_crypto = require("crypto");
var import_crypto2 = require("crypto");
var __defProp2 = Object.defineProperty;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
};
var __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
};
var stream_to_buffer_exports = {};
__export2(stream_to_buffer_exports, {
  default: () => streamToBuffer2
});
async function streamToBuffer2(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
var init_stream_to_buffer = __esm({
  "src/utils/stream-to-buffer.ts"() {
    "use strict";
  }
});
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
var MULTIPART_THRESHOLD = 5 * 1024 * 1024;
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
var FileVersionsNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  async list(fileId) {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}/versions`);
  }
  async restore(fileId, versionId) {
    return this.http.post(`/v1/projects/${this.projectId}/files/${fileId}/versions/${versionId}/restore`);
  }
};
var FilesNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
    this.versions = new FileVersionsNamespace(http, projectId);
  }
  async upload(options) {
    let data;
    if (Buffer.isBuffer(options.data) || options.data instanceof Uint8Array) {
      data = Buffer.from(options.data);
    } else {
      data = await streamToBuffer(options.data);
    }
    if (data.length >= MULTIPART_THRESHOLD) {
      return this._multipartUpload(data, options);
    }
    return this._singleUpload(data, options);
  }
  async _singleUpload(data, options) {
    const contentType = options.mimeType ?? "application/octet-stream";
    const init = await this.http.post(
      `/v1/projects/${this.projectId}/files/upload`,
      {
        filename: options.filename,
        content_type: contentType,
        size_bytes: data.length,
        folder_id: options.folderId ?? null,
        metadata: options.metadata ?? {},
        tags: options.tags ?? []
      }
    );
    options.onProgress?.({ bytesUploaded: 0, totalBytes: data.length, percentage: 0, chunkNumber: 1, totalChunks: 1 });
    await fetch(init.uploadUrl, {
      method: "PUT",
      body: data,
      headers: { "Content-Type": contentType }
    });
    options.onProgress?.({ bytesUploaded: data.length, totalBytes: data.length, percentage: 100, chunkNumber: 1, totalChunks: 1 });
    await this.http.post(`/v1/projects/${this.projectId}/files/${init.fileId}/confirm`);
    return this.http.get(`/v1/projects/${this.projectId}/files/${init.fileId}`);
  }
  async _multipartUpload(data, options) {
    const contentType = options.mimeType ?? "application/octet-stream";
    const session = await this.http.post(
      `/v1/projects/${this.projectId}/files/upload/multipart/start`,
      {
        filename: options.filename,
        content_type: contentType,
        total_size_bytes: data.length,
        folder_id: options.folderId ?? null,
        metadata: options.metadata ?? {},
        tags: options.tags ?? []
      }
    );
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    const parts = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = data.slice(start, start + CHUNK_SIZE);
      const { url } = await this.http.get(
        `/v1/projects/${this.projectId}/files/upload/multipart/${session.uploadId}/part-url`,
        { part: i + 1 }
      );
      const partRes = await fetch(url, { method: "PUT", body: chunk });
      const etag = partRes.headers.get("etag") ?? "";
      parts.push({ part_number: i + 1, etag });
      options.onProgress?.({
        bytesUploaded: Math.min((i + 1) * CHUNK_SIZE, data.length),
        totalBytes: data.length,
        percentage: Math.round((i + 1) / totalChunks * 100),
        chunkNumber: i + 1,
        totalChunks
      });
    }
    const result = await this.http.post(
      `/v1/projects/${this.projectId}/files/upload/multipart/${session.uploadId}/complete`,
      { parts }
    );
    return this.http.get(`/v1/projects/${this.projectId}/files/${result.fileId}`);
  }
  /** Get a presigned download URL. The URL can be used to download the file directly from storage. */
  async getDownloadUrl(fileId, options = {}) {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}/download`, {
      ttl: options.ttl,
      disposition: options.disposition
    });
  }
  /** Stream the file bytes via the presigned download URL. */
  async download(fileId) {
    const { url } = await this.getDownloadUrl(fileId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Storage download failed: ${res.status}`);
    const { Readable } = await import("stream");
    return Readable.fromWeb(res.body);
  }
  /** Download and buffer the full file in memory. */
  async downloadToBuffer(fileId) {
    const stream = await this.download(fileId);
    return streamToBuffer(stream);
  }
  async list(filters = {}) {
    const { metadata, tags, ...rest } = filters;
    return this.http.get(`/v1/projects/${this.projectId}/files`, {
      ...rest,
      ...metadata ? { metadata: JSON.stringify(metadata) } : {},
      ...tags ? { tags: tags.join(",") } : {}
    });
  }
  async get(fileId) {
    return this.http.get(`/v1/projects/${this.projectId}/files/${fileId}`);
  }
  async update(fileId, options) {
    return this.http.patch(`/v1/projects/${this.projectId}/files/${fileId}`, options);
  }
  async delete(fileId) {
    return this.http.delete(`/v1/projects/${this.projectId}/files/${fileId}`);
  }
  async restore(fileId) {
    return this.http.post(`/v1/projects/${this.projectId}/files/${fileId}/restore`);
  }
  /** Verify an HMAC-SHA256 webhook signature. */
  static verifyWebhookSignature(rawBody, signature, secret) {
    const expected = (0, import_crypto.createHmac)("sha256", secret).update(rawBody).digest("hex");
    const received = signature.replace("sha256=", "");
    return expected === received;
  }
};
var FoldersNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  async create(options) {
    return this.http.post(`/v1/projects/${this.projectId}/folders`, {
      name: options.name,
      parent_folder_id: options.parentFolderId,
      metadata: options.metadata
    });
  }
  async list(options = {}) {
    return this.http.get(`/v1/projects/${this.projectId}/folders`, {
      name: options.name
    });
  }
  async get(folderId) {
    return this.http.get(`/v1/projects/${this.projectId}/folders/${folderId}`);
  }
  /** Resolve a slash-separated path string to the matching folder. Returns null if not found. */
  async getByPath(path) {
    try {
      return await this.http.get(`/v1/projects/${this.projectId}/folders/by-path`, { path });
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }
  /**
   * Idempotently create every missing segment of a path and return the leaf folder.
   * If the full path already exists the existing folder is returned unchanged.
   *
   * @example
   * const folder = await fn.folders.ensurePath("users/alice/uploads");
   */
  async ensurePath(path) {
    return this.http.post(`/v1/projects/${this.projectId}/folders/ensure-path`, { path });
  }
  /** List all files directly inside a folder with optional filters and pagination. */
  async listFiles(folderId, options = {}) {
    return this.http.get(`/v1/projects/${this.projectId}/folders/${folderId}/files`, {
      q: options.q,
      tags: options.tags?.join(","),
      category: options.category,
      status: options.status,
      limit: options.limit,
      offset: options.offset,
      cursor: options.cursor
    });
  }
  async delete(folderId) {
    return this.http.delete(`/v1/projects/${this.projectId}/folders/${folderId}`);
  }
};
var SearchNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  async query(input) {
    const options = typeof input === "string" ? { q: input } : input;
    return this.http.post(`/v1/projects/${this.projectId}/search`, options);
  }
  async *iterate(options = {}) {
    const limit = options.limit ?? 50;
    let offset = 0;
    while (true) {
      const results = await this.query({ ...options, limit, offset });
      for (const hit of results.hits) {
        yield hit.file;
      }
      if (results.hits.length < limit) break;
      offset += limit;
    }
  }
};
var WebhooksNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  async create(options) {
    return this.http.post(`/v1/projects/${this.projectId}/webhooks`, options);
  }
  async list() {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks`);
  }
  async get(webhookId) {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks/${webhookId}`);
  }
  async update(webhookId, options) {
    return this.http.patch(`/v1/projects/${this.projectId}/webhooks/${webhookId}`, options);
  }
  async delete(webhookId) {
    return this.http.delete(`/v1/projects/${this.projectId}/webhooks/${webhookId}`);
  }
  async listDeliveries(webhookId, options = {}) {
    return this.http.get(`/v1/projects/${this.projectId}/webhooks/${webhookId}/deliveries`, {
      limit: options.limit,
      offset: options.offset
    });
  }
  /**
   * Verify an incoming webhook payload using HMAC-SHA256.
   *
   * Uses `timingSafeEqual` to prevent timing attacks. The `rawBody` must be
   * the raw request body bytes before any JSON parsing.
   */
  verify(rawBody, signature, secret) {
    const body = typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    const expected = (0, import_crypto2.createHmac)("sha256", secret).update(body).digest("hex");
    try {
      return (0, import_crypto2.timingSafeEqual)(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
    } catch {
      return false;
    }
  }
};
var UploadTokensNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  async create(options = {}) {
    return this.http.post(`/v1/projects/${this.projectId}/upload-tokens`, {
      max_size: options.maxSize,
      allowed_mime_types: options.allowedMimeTypes,
      max_files: options.maxFiles,
      folder_id: options.folderId,
      metadata: options.metadata,
      tags: options.tags,
      expires_in: options.expiresIn,
      owner_user_id: options.ownerUserId,
      owner_org_id: options.ownerOrgId
    });
  }
};
var UploadsNamespace = class {
  constructor(http, projectId) {
    this.http = http;
    this.projectId = projectId;
  }
  /** Create a new multipart upload session and return the session IDs. */
  async create(options) {
    return this.http.post(`/v1/projects/${this.projectId}/files/upload/multipart/start`, {
      filename: options.filename,
      content_type: options.mimeType ?? "application/octet-stream",
      total_size_bytes: options.sizeBytes,
      folder_id: options.folderId ?? null,
      metadata: options.metadata ?? {},
      tags: options.tags ?? []
    });
  }
  /** Upload all parts for an existing session and complete it. */
  async resume(uploadId, options) {
    let data;
    if (Buffer.isBuffer(options.data)) {
      data = options.data;
    } else {
      const { default: streamToBuffer3 } = await Promise.resolve().then(() => (init_stream_to_buffer(), stream_to_buffer_exports));
      data = await streamToBuffer3(options.data);
    }
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    const parts = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = data.slice(start, start + CHUNK_SIZE);
      const { url } = await this.http.get(
        `/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}/part-url`,
        { part: i + 1 }
      );
      const partRes = await fetch(url, { method: "PUT", body: chunk });
      const etag = partRes.headers.get("etag") ?? "";
      parts.push({ part_number: i + 1, etag });
      options.onProgress?.({
        bytesUploaded: Math.min((i + 1) * CHUNK_SIZE, data.length),
        totalBytes: data.length,
        percentage: Math.round((i + 1) / totalChunks * 100),
        chunkNumber: i + 1,
        totalChunks
      });
    }
    const result = await this.http.post(
      `/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}/complete`,
      { parts }
    );
    return this.http.get(`/v1/projects/${this.projectId}/files/${result.fileId}`);
  }
  /** Abort a multipart session and discard all uploaded parts. */
  async abort(uploadId) {
    await this.http.delete(`/v1/projects/${this.projectId}/files/upload/multipart/${uploadId}`);
  }
};
var FileNest = class {
  constructor(config) {
    this.http = new FileNestHttpClient(config);
    const { projectId } = config;
    this.files = new FilesNamespace(this.http, projectId);
    this.folders = new FoldersNamespace(this.http, projectId);
    this.search = new SearchNamespace(this.http, projectId);
    this.webhooks = new WebhooksNamespace(this.http, projectId);
    this.uploadTokens = new UploadTokensNamespace(this.http, projectId);
    this.uploads = new UploadsNamespace(this.http, projectId);
  }
};

// src/server/index.ts
function filenestServer(config) {
  return new FileNest(config);
}
async function createUploadToken(options) {
  const { apiKey, projectId, baseUrl, ...tokenOptions } = options;
  const fn = new FileNest({ apiKey, projectId, baseUrl });
  return fn.uploadTokens.create(tokenOptions);
}
function verifyWebhookSignature(body, signature, secret) {
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const expected = (0, import_crypto3.createHmac)("sha256", secret).update(body, "utf8").digest("hex");
  try {
    return (0, import_crypto3.timingSafeEqual)(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
  } catch {
    return false;
  }
}
function parseWebhookEvent(body) {
  return JSON.parse(body);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FileNest,
  createUploadToken,
  filenestServer,
  parseWebhookEvent,
  verifyWebhookSignature
});
//# sourceMappingURL=server.js.map