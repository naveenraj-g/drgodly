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
type WebhookEvent$1 = "file.uploaded" | "file.processed" | "file.deleted" | "file.virus_detected" | "file.quarantined" | "file.ready";
interface Webhook {
    id: string;
    projectId: string;
    name: string;
    url: string;
    events: WebhookEvent$1[];
    status: WebhookStatus;
    signingSecret: string;
    createdAt: string;
    updatedAt: string;
}
interface WebhookDelivery {
    id: string;
    webhookId: string;
    event: WebhookEvent$1;
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
interface FileNestHttpClientConfig$1 {
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
    constructor(config: FileNestHttpClientConfig$1);
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
 * @filenest/nextjs types/events — typed webhook event union.
 * @module
 */

interface FileUploadedEvent {
    type: "file.uploaded";
    data: {
        fileId: string;
        filename: string;
        projectId: string;
        organizationId: string;
        metadata?: Record<string, unknown>;
        file: FileRecord;
    };
}
interface FileProcessedEvent {
    type: "file.processed";
    data: {
        fileId: string;
        filename: string;
        projectId: string;
        organizationId: string;
        status: "ready" | "failed";
        stages: {
            name: string;
            passed: boolean;
            error?: string;
        }[];
        file: FileRecord;
    };
}
interface FileDeletedEvent {
    type: "file.deleted";
    data: {
        fileId: string;
        filename: string;
        projectId: string;
        organizationId: string;
    };
}
interface FileVirusDetectedEvent {
    type: "file.virus_detected";
    data: {
        fileId: string;
        filename: string;
        projectId: string;
        organizationId: string;
        virusName: string;
    };
}
interface FileReadyEvent {
    type: "file.ready";
    data: {
        fileId: string;
        filename: string;
        projectId: string;
        organizationId: string;
        file: FileRecord;
    };
}
/** Discriminated union of all webhook event shapes. */
type WebhookEvent = FileUploadedEvent | FileProcessedEvent | FileDeletedEvent | FileVirusDetectedEvent | FileReadyEvent;

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

export { type AuditLog, AuthenticationError, AuthorizationError, ConflictError, type DownloadUrlResponse, type FileDeletedEvent, type FileNestConfig, FileNestError, FileNestHttpClient, type FileNestHttpClientConfig$1 as FileNestHttpClientConfig, FileNotFoundError, type FileProcessedEvent, type FileReadyEvent, type FileRecord, type FileStatus, type FileUploadedEvent, type FileVersion, type FileVirusDetectedEvent, type Folder, LegalHoldError, type ListResponse, MetadataValidationError, type MultipartSession, NetworkError, NotFoundError, type Project, RateLimitError, type SearchFacets, type SearchFilters, type SearchHit, type SearchResults, StorageError, type StorageMode, type StorageProvider, type UploadProgress, type UploadToken, ValidationError, WORMViolationError, type Webhook, type WebhookDelivery, type WebhookEvent, type WebhookStatus };
