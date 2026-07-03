import { Readable } from 'stream';

/**
 * @filenest/core types — shared TypeScript types for all FileNest SDKs.
 *
 * These types mirror the FastAPI backend Pydantic models after the HTTP client
 * applies its snake_case → camelCase response transformer. All SDK response
 * objects are typed with these interfaces.
 *
 * @module
 */
type FileStatus$1 = "pending" | "uploading" | "processing" | "ready" | "failed" | "quarantined" | "deleted";
interface FileRecord$1 {
    id: string;
    projectId: string;
    organizationId: string;
    filename: string;
    /** MIME type — maps from backend field `content_type`. */
    contentType: string;
    /** File size in bytes — maps from backend field `size_bytes`. */
    sizeBytes: number;
    status: FileStatus$1;
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
interface UploadToken$1 {
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
    file: FileRecord$1;
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
    upload(options: UploadOptions): Promise<FileRecord$1>;
    private _singleUpload;
    private _multipartUpload;
    /** Get a presigned download URL. The URL can be used to download the file directly from storage. */
    getDownloadUrl(fileId: string, options?: GetDownloadUrlOptions): Promise<DownloadUrlResponse>;
    /** Stream the file bytes via the presigned download URL. */
    download(fileId: string): Promise<Readable>;
    /** Download and buffer the full file in memory. */
    downloadToBuffer(fileId: string): Promise<Buffer>;
    list(filters?: FileListFilters): Promise<ListResponse<FileRecord$1>>;
    get(fileId: string): Promise<FileRecord$1>;
    update(fileId: string, options: FileUpdateOptions): Promise<FileRecord$1>;
    delete(fileId: string): Promise<void>;
    restore(fileId: string): Promise<FileRecord$1>;
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
    listFiles(folderId: string, options?: FolderListFilesOptions): Promise<ListResponse<FileRecord$1>>;
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
    iterate(options?: SearchOptions): AsyncIterableIterator<FileRecord$1>;
}

/**
 * @filenest/node namespaces/webhooks — WebhooksNamespace implementation.
 * @module
 */

interface WebhookCreateOptions {
    name: string;
    url: string;
    events: WebhookEvent$1[];
}
interface WebhookUpdateOptions {
    name?: string;
    url?: string;
    events?: WebhookEvent$1[];
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
    create(options?: CreateUploadTokenOptions): Promise<UploadToken$1>;
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
    resume(uploadId: string, options: ResumeUploadOptions): Promise<FileRecord$1>;
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
interface UploadToken {
    token: string;
    expiresAt: string;
    constraints: {
        maxSize: number;
        allowedMimeTypes: string[];
        maxFiles: number;
    };
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
 * @filenest/nextjs server — server-only utilities for Next.js App Router.
 *
 * Import from '@filenest/nextjs/server' in server components, server actions,
 * and route handlers. Never import this in client components.
 *
 * @module
 */

/**
 * Create a server-side FileNest client configured for Next.js server contexts.
 *
 * Usage in server components and server actions:
 *   const fn = filenestServer({ apiKey: process.env.FILENEST_API_KEY!, projectId: '...' });
 *   const { data: files } = await fn.files.list();
 */
declare function filenestServer(config: FileNestConfig): FileNest;
/**
 * Generate a short-lived upload token for use by the `<FileNestProvider>` in the browser.
 *
 * Call this from your `/api/filenest-token` route handler. The token is returned
 * to the browser and used by `@filenest/react` for authenticated uploads.
 */
declare function createUploadToken(options: CreateUploadTokenOptions & {
    apiKey: string;
    projectId: string;
    baseUrl?: string;
}): Promise<UploadToken>;
/**
 * Verify an incoming webhook signature using HMAC-SHA256.
 *
 * The `body` must be the raw request body string (before JSON parsing).
 * Uses timing-safe comparison to prevent timing attacks.
 */
declare function verifyWebhookSignature(body: string, signature: string, secret: string): boolean;
/**
 * Parse and type the raw webhook event body.
 *
 * Call after `verifyWebhookSignature` returns `true`.
 */
declare function parseWebhookEvent(body: string): WebhookEvent;

export { type CreateUploadTokenOptions, type FileDeletedEvent, FileNest, type FileProcessedEvent, type FileReadyEvent, type FileUploadedEvent, type FileVirusDetectedEvent, type WebhookEvent, createUploadToken, filenestServer, parseWebhookEvent, verifyWebhookSignature };
