import { Readable } from 'stream';

/**
 * @filenest/core errors — typed error hierarchy for all FileNest SDKs.
 *
 * Every non-2xx response from the API is mapped to one of these classes so
 * callers can write typed catch blocks instead of checking status codes.
 *
 * @module
 */
/** Base class for all FileNest SDK errors. */
declare class FileNestError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode: number);
}
/** 401 — invalid or missing API key. */
declare class AuthenticationError extends FileNestError {
    constructor(message?: string);
}
/** 403 — token lacks the required scope. */
declare class AuthorizationError extends FileNestError {
    readonly requiredScope?: string;
    constructor(message?: string, requiredScope?: string);
}
/** 404 — generic resource not found. */
declare class NotFoundError extends FileNestError {
    constructor(message?: string);
}
/** 404 — file specifically not found. */
declare class FileNotFoundError extends NotFoundError {
    readonly fileId?: string;
    constructor(fileId?: string);
}
/** 409 — generic conflict. */
declare class ConflictError extends FileNestError {
    constructor(message?: string);
}
/** 409 — attempt to mutate a WORM-committed file. */
declare class WORMViolationError extends FileNestError {
    constructor(message?: string);
}
/** 409 — attempt to delete/move a file under legal hold. */
declare class LegalHoldError extends FileNestError {
    readonly reason?: string;
    constructor(message?: string, reason?: string);
}
/** 422 — generic validation error. */
declare class ValidationError extends FileNestError {
    readonly validationErrors: {
        field: string;
        message: string;
        value?: unknown;
    }[];
    constructor(message?: string, validationErrors?: {
        field: string;
        message: string;
        value?: unknown;
    }[], code?: string);
}
/** 422 — file metadata failed schema validation. */
declare class MetadataValidationError extends ValidationError {
    constructor(validationErrors?: {
        field: string;
        message: string;
        value?: unknown;
    }[]);
}
/** 429 — rate limit exceeded. Includes retry-after seconds. */
declare class RateLimitError extends FileNestError {
    readonly retryAfter?: number;
    constructor(message?: string, retryAfter?: number);
}
/** Network-level failure (fetch/connect error, timeout). */
declare class NetworkError extends FileNestError {
    readonly cause?: unknown;
    constructor(message?: string, cause?: unknown);
}
/** Storage provider returned an error during upload/download. */
declare class StorageError extends FileNestError {
    constructor(message?: string);
}

/**
 * @filenest/core types — shared TypeScript types for all FileNest SDKs.
 *
 * These types mirror the FastAPI backend Pydantic models after the HTTP client
 * applies its snake_case → camelCase response transformer. All SDK response
 * objects are typed with these interfaces.
 *
 * @module
 */
type FileStatus = "pending" | "uploading" | "processing" | "ready" | "failed" | "quarantined" | "deleted";
interface FileRecord {
    id: string;
    projectId: string;
    organizationId: string;
    filename: string;
    /** MIME type — maps from backend field `content_type`. */
    contentType: string;
    /** File size in bytes — maps from backend field `size_bytes`. */
    sizeBytes: number;
    status: FileStatus;
    storageKey: string;
    folderId: string | null;
    category: string | null;
    versionCount: number;
    tags: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
interface FileVersion {
    id: string;
    fileId: string;
    versionNumber: number;
    storageKey: string;
    sizeBytes: number;
    contentType: string;
    createdAt: string;
}
interface Folder {
    id: string;
    projectId: string;
    parentFolderId: string | null;
    name: string;
    path: string;
    fileCount?: number;
    totalSizeBytes?: number;
    createdAt: string;
}
type StorageMode = "managed" | "byob";
type StorageProvider = "s3" | "azure_blob" | "gcs" | "minio" | "r2" | "rustfs";
interface Project {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    description: string | null;
    storageMode: StorageMode;
    storageProvider: StorageProvider;
    createdAt: string;
    updatedAt: string;
}
type WebhookStatus = "active" | "disabled" | "failing";
type WebhookEvent = "file.uploaded" | "file.processed" | "file.deleted" | "file.virus_detected" | "file.quarantined" | "file.ready";
interface Webhook {
    id: string;
    projectId: string;
    name: string;
    url: string;
    events: WebhookEvent[];
    status: WebhookStatus;
    signingSecret: string;
    createdAt: string;
    updatedAt: string;
}
interface WebhookDelivery$1 {
    id: string;
    webhookId: string;
    event: WebhookEvent;
    statusCode: number | null;
    success: boolean;
    attemptCount: number;
    responseBody: string | null;
    deliveredAt: string | null;
    createdAt: string;
}
interface UploadProgress {
    bytesUploaded: number;
    totalBytes: number;
    percentage: number;
    chunkNumber: number;
    totalChunks: number;
}
/** Response from `POST /files/upload/multipart/start`. */
interface MultipartSession {
    uploadId: string;
    fileId: string;
}
interface UploadToken {
    token: string;
    expiresAt: string;
    constraints: {
        maxSize: number;
        allowedMimeTypes: string[];
        maxFiles: number;
    };
}
interface DownloadUrlResponse {
    url: string;
    expiresAt: string;
}
interface SearchFilters {
    metadata?: Record<string, string>;
    tags?: string[];
    mimeType?: string[];
    createdAfter?: Date | string;
    createdBefore?: Date | string;
    folderId?: string;
    sizeMin?: number;
    sizeMax?: number;
}
interface SearchHit {
    fileId: string;
    filename: string;
    score: number;
    highlights: Record<string, string[]>;
    file: FileRecord;
}
interface SearchFacets {
    mimeType?: {
        value: string;
        count: number;
    }[];
    tags?: {
        value: string;
        count: number;
    }[];
}
interface SearchResults {
    hits: SearchHit[];
    total: number;
    queryTimeMs: number;
    facets?: SearchFacets;
}
interface AuditLog {
    id: string;
    organizationId: string;
    projectId: string;
    fileId: string | null;
    actorType: "api_key" | "upload_token" | "service_account";
    actorId: string;
    eventType: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}
/**
 * Standard list response from the backend.
 * `items` is the record list; pagination fields are at the top level (flat).
 */
interface ListResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor: string | null;
}

/**
 * @filenest/core http/client — shared HTTP client used by all JS/TS SDKs.
 *
 * Handles auth header injection, JSON serialization, error mapping (HTTP status
 * → typed FileNestError subclass), and exponential-backoff retry on 5xx.
 *
 * @module
 */
interface FileNestHttpClientConfig {
    apiKey: string;
    projectId?: string;
    baseUrl?: string;
    timeout?: number;
    maxRetries?: number;
    apiVersion?: string;
}
declare class FileNestHttpClient {
    private readonly apiKey;
    readonly projectId?: string;
    private readonly baseUrl;
    private readonly timeout;
    private readonly maxRetries;
    private readonly headers;
    constructor(config: FileNestHttpClientConfig);
    private url;
    private fetchWithRetry;
    get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    post<T>(path: string, body?: unknown): Promise<T>;
    patch<T>(path: string, body?: unknown): Promise<T>;
    delete<T = void>(path: string): Promise<T>;
    /** Raw fetch for binary/multipart use cases (upload, streaming download). */
    rawFetch(path: string, init: RequestInit): Promise<Response>;
}

/**
 * @filenest/node namespaces/files — FilesNamespace implementation.
 *
 * Provides all file operations: upload (single + auto-multipart), download,
 * list, get, update metadata/tags, soft delete, and version management.
 *
 * Upload flow (both single and multipart):
 *   1. POST JSON to init endpoint → receive presigned storage URL + file_id
 *   2. PUT bytes directly to presigned storage URL (bypasses backend)
 *   3. POST /confirm → triggers processing pipeline
 *
 * @module
 */

interface UploadOptions {
    filename: string;
    data: Buffer | Readable | Uint8Array;
    mimeType?: string;
    size?: number;
    folderId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    onProgress?: (progress: UploadProgress) => void;
}
interface FileListFilters {
    folderId?: string;
    mimeType?: string;
    status?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    metadata?: Record<string, string>;
}
interface FileUpdateOptions {
    tags?: string[];
    metadata?: Record<string, unknown>;
    filename?: string;
}
interface GetDownloadUrlOptions {
    ttl?: number;
    disposition?: "inline" | "attachment";
}
declare class FileVersionsNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    list(fileId: string): Promise<{
        items: FileVersion[];
        total: number;
    }>;
    restore(fileId: string, versionId: string): Promise<{
        fileId: string;
        versionNumber: number;
    }>;
}
declare class FilesNamespace {
    private readonly http;
    private readonly projectId;
    readonly versions: FileVersionsNamespace;
    constructor(http: FileNestHttpClient, projectId: string);
    upload(options: UploadOptions): Promise<FileRecord>;
    private _singleUpload;
    private _multipartUpload;
    /** Get a presigned download URL. The URL can be used to download the file directly from storage. */
    getDownloadUrl(fileId: string, options?: GetDownloadUrlOptions): Promise<DownloadUrlResponse>;
    /** Stream the file bytes via the presigned download URL. */
    download(fileId: string): Promise<Readable>;
    /** Download and buffer the full file in memory. */
    downloadToBuffer(fileId: string): Promise<Buffer>;
    list(filters?: FileListFilters): Promise<ListResponse<FileRecord>>;
    get(fileId: string): Promise<FileRecord>;
    update(fileId: string, options: FileUpdateOptions): Promise<FileRecord>;
    delete(fileId: string): Promise<void>;
    restore(fileId: string): Promise<FileRecord>;
    /** Verify an HMAC-SHA256 webhook signature. */
    static verifyWebhookSignature(rawBody: Buffer, signature: string, secret: string): boolean;
}

/**
 * @filenest/node namespaces/folders — FoldersNamespace implementation.
 * @module
 */

interface FolderCreateOptions {
    name: string;
    parentFolderId?: string;
    metadata?: Record<string, unknown>;
}
interface FolderListOptions {
    /** Filter folders by exact name match. */
    name?: string;
}
interface FolderListFilesOptions {
    q?: string;
    tags?: string[];
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
    cursor?: string;
}
declare class FoldersNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    create(options: FolderCreateOptions): Promise<Folder>;
    list(options?: FolderListOptions): Promise<ListResponse<Folder>>;
    get(folderId: string): Promise<Folder>;
    /** Resolve a slash-separated path string to the matching folder. Returns null if not found. */
    getByPath(path: string): Promise<Folder | null>;
    /**
     * Idempotently create every missing segment of a path and return the leaf folder.
     * If the full path already exists the existing folder is returned unchanged.
     *
     * @example
     * const folder = await fn.folders.ensurePath("users/alice/uploads");
     */
    ensurePath(path: string): Promise<Folder>;
    /** List all files directly inside a folder with optional filters and pagination. */
    listFiles(folderId: string, options?: FolderListFilesOptions): Promise<ListResponse<FileRecord>>;
    delete(folderId: string): Promise<void>;
}

/**
 * @filenest/node namespaces/search — SearchNamespace implementation.
 * @module
 */

interface SearchOptions {
    q?: string;
    filters?: SearchFilters;
    facets?: string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}
declare class SearchNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    query(input: string | SearchOptions): Promise<SearchResults>;
    iterate(options?: SearchOptions): AsyncIterableIterator<FileRecord>;
}

/**
 * @filenest/node namespaces/webhooks — WebhooksNamespace implementation.
 * @module
 */

interface WebhookCreateOptions {
    name: string;
    url: string;
    events: WebhookEvent[];
}
interface WebhookUpdateOptions {
    name?: string;
    url?: string;
    events?: WebhookEvent[];
    status?: "active" | "disabled";
}
interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: string;
    status: "success" | "failed" | "pending";
    responseStatus?: number;
    attemptedAt: string;
    nextRetryAt?: string;
}
interface WebhookDeliveryListOptions {
    limit?: number;
    offset?: number;
}
declare class WebhooksNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    create(options: WebhookCreateOptions): Promise<Webhook>;
    list(): Promise<ListResponse<Webhook>>;
    get(webhookId: string): Promise<Webhook>;
    update(webhookId: string, options: WebhookUpdateOptions): Promise<Webhook>;
    delete(webhookId: string): Promise<void>;
    listDeliveries(webhookId: string, options?: WebhookDeliveryListOptions): Promise<ListResponse<WebhookDelivery>>;
    /**
     * Verify an incoming webhook payload using HMAC-SHA256.
     *
     * Uses `timingSafeEqual` to prevent timing attacks. The `rawBody` must be
     * the raw request body bytes before any JSON parsing.
     */
    verify(rawBody: Buffer | string, signature: string, secret: string): boolean;
}

/**
 * @filenest/node namespaces/upload-tokens — UploadTokensNamespace implementation.
 *
 * Generates short-lived upload tokens for use by browser clients.
 * The token is passed to `<FileNestProvider tokenEndpoint>` or used directly
 * in the `Authorization: Bearer` header by `@filenest/react`.
 *
 * @module
 */

interface CreateUploadTokenOptions {
    maxSize?: number;
    allowedMimeTypes?: string[];
    maxFiles?: number;
    folderId?: string;
    metadata?: Record<string, unknown>;
    /** Tags applied to every file uploaded with this token. Merged with any tags the browser sends. */
    tags?: string[];
    expiresIn?: number;
    /** End-user ID to embed in the token. Copied to every file uploaded with it. */
    ownerUserId?: string;
    /** End-user's org ID to embed in the token. Copied to every file uploaded with it. */
    ownerOrgId?: string;
}
declare class UploadTokensNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    create(options?: CreateUploadTokenOptions): Promise<UploadToken>;
}

/**
 * @filenest/node namespaces/uploads — UploadsNamespace for resumable multipart sessions.
 *
 * Use this when you want manual control over the multipart session lifecycle
 * (e.g., resumable uploads where the session can survive a network interruption).
 * For simple uploads, `files.upload()` handles multipart automatically.
 *
 * @module
 */

interface UploadSessionCreateOptions {
    filename: string;
    /** Total file size in bytes. */
    sizeBytes: number;
    mimeType?: string;
    folderId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
}
interface ResumeUploadOptions {
    data: Buffer | Readable;
    onProgress?: (progress: UploadProgress) => void;
}
declare class UploadsNamespace {
    private readonly http;
    private readonly projectId;
    constructor(http: FileNestHttpClient, projectId: string);
    /** Create a new multipart upload session and return the session IDs. */
    create(options: UploadSessionCreateOptions): Promise<MultipartSession>;
    /** Upload all parts for an existing session and complete it. */
    resume(uploadId: string, options: ResumeUploadOptions): Promise<FileRecord>;
    /** Abort a multipart session and discard all uploaded parts. */
    abort(uploadId: string): Promise<void>;
}

/**
 * @filenest/node client — FileNest Node.js SDK main client class.
 *
 * Usage:
 *   import { FileNest } from '@filenest/node';
 *   const fn = new FileNest({ apiKey: process.env.FILENEST_API_KEY!, projectId: 'proj_...' });
 *   const file = await fn.files.upload({ filename: 'report.pdf', data: buffer });
 *
 * @module
 */

interface FileNestConfig extends FileNestHttpClientConfig {
    projectId: string;
}
declare class FileNest {
    readonly files: FilesNamespace;
    readonly folders: FoldersNamespace;
    readonly search: SearchNamespace;
    readonly webhooks: WebhooksNamespace;
    readonly uploadTokens: UploadTokensNamespace;
    readonly uploads: UploadsNamespace;
    private readonly http;
    constructor(config: FileNestConfig);
}

export { type AuditLog, AuthenticationError, AuthorizationError, ConflictError, type CreateUploadTokenOptions, type DownloadUrlResponse, type FileListFilters, FileNest, type FileNestConfig, FileNestError, FileNestHttpClient, type FileNestHttpClientConfig, FileNotFoundError, type FileRecord, type FileStatus, type FileUpdateOptions, type FileVersion, type Folder, type FolderCreateOptions, type FolderListOptions, type GetDownloadUrlOptions, LegalHoldError, type ListResponse, MetadataValidationError, type MultipartSession, NetworkError, NotFoundError, type Project, RateLimitError, type ResumeUploadOptions, type SearchFacets, type SearchFilters, type SearchHit, type SearchOptions, type SearchResults, StorageError, type StorageMode, type StorageProvider, type UploadOptions, type UploadProgress, type UploadSessionCreateOptions, type UploadToken, ValidationError, WORMViolationError, type Webhook, type WebhookCreateOptions, type WebhookDelivery$1 as WebhookDelivery, type WebhookEvent, type WebhookStatus, type WebhookUpdateOptions };
