import React from 'react';
import * as _tanstack_react_query from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

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
interface UploadProgress {
    bytesUploaded: number;
    totalBytes: number;
    percentage: number;
    chunkNumber: number;
    totalChunks: number;
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
interface SearchResults$1 {
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
 * @filenest/react context/FileNestContext — configurable provider and context for the React SDK.
 *
 * Supports three tiers of usage:
 *   Tier 1 — Drop-in components: <FileUpload />, <FilePreview />, <FileViewer />
 *   Tier 2 — Managed hooks: useUpload(), useFiles(), useFolder(), useSearch()
 *   Tier 3 — Raw imperative methods: useFileNest() → upload(), listFiles(), createFolder(), ...
 *
 * Token behaviour is fully configurable via `fetchInitialToken`, `tokenFetcher`,
 * `tokenRefreshBuffer`, and `tokenRetry` props.
 *
 * @module
 */

interface InitUploadOptions {
    filename: string;
    contentType: string;
    sizeBytes: number;
    folderId?: string | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
}
interface InitUploadResult {
    fileId: string;
    uploadUrl: string;
    expiresAt: string;
}
interface UploadToStorageOptions {
    onProgress?: (p: UploadProgress) => void;
}
interface ConfirmUploadResult {
    id: string;
    status: string;
}
interface UploadOptions {
    folderId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    onProgress?: (p: UploadProgress) => void;
}
interface FileListFilters {
    folderId?: string | null;
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
    filename?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
interface DownloadUrlOptions {
    ttl?: number;
    disposition?: "inline" | "attachment";
}
interface DownloadUrlResult {
    url: string;
    expiresAt: string;
}
interface FolderListOptions {
    parentFolderId?: string | null;
    name?: string;
    limit?: number;
    offset?: number;
}
interface CreateFolderOptions {
    name: string;
    parentFolderId?: string | null;
}
interface SearchQuery {
    q?: string;
    filters?: SearchFilters;
    tags?: string[];
    limit?: number;
    offset?: number;
}
interface SearchResults {
    hits: SearchHit[];
    total: number;
    facets?: SearchFacets;
    queryTimeMs: number;
}
interface FileNestContextValue {
    projectId: string;
    baseUrl: string;
    debug: boolean;
    tokenEndpoint: string;
    token: string | null;
    isTokenLoading: boolean;
    tokenError: Error | null;
    isReady: boolean;
    getToken: () => Promise<string>;
    initUpload: (options: InitUploadOptions) => Promise<InitUploadResult>;
    uploadToStorage: (url: string, file: File | Blob, options?: UploadToStorageOptions) => Promise<void>;
    confirmUpload: (fileId: string) => Promise<ConfirmUploadResult>;
    upload: (file: File, options?: UploadOptions) => Promise<FileRecord>;
    listFiles: (filters?: FileListFilters) => Promise<ListResponse<FileRecord>>;
    getFile: (fileId: string) => Promise<FileRecord>;
    deleteFile: (fileId: string) => Promise<void>;
    updateFile: (fileId: string, options: FileUpdateOptions) => Promise<FileRecord>;
    getDownloadUrl: (fileId: string, options?: DownloadUrlOptions) => Promise<DownloadUrlResult>;
    listFolders: (options?: FolderListOptions) => Promise<ListResponse<Folder>>;
    createFolder: (options: CreateFolderOptions) => Promise<Folder>;
    getFolder: (folderId: string) => Promise<Folder>;
    getFolderByPath: (path: string) => Promise<Folder | null>;
    deleteFolder: (folderId: string) => Promise<void>;
    ensurePath: (path: string) => Promise<Folder>;
    search: (query: SearchQuery) => Promise<SearchResults>;
}
interface FileNestProviderProps {
    projectId: string;
    /**
     * Base URL of the FileNest backend (e.g. "https://api.filenest.io").
     * Defaults to "" (same origin).
     */
    baseUrl?: string;
    /**
     * URL of your server-side token endpoint. The provider will POST to this
     * URL to obtain short-lived upload tokens.
     * Use this OR `tokenFetcher` — not both.
     */
    tokenEndpoint?: string;
    /**
     * Custom async function that fetches and returns an upload token.
     * Use when you need custom headers, auth, or a non-standard endpoint shape.
     * Use this OR `tokenEndpoint` — not both.
     */
    tokenFetcher?: () => Promise<{
        token: string;
        expiresAt: string;
    }>;
    /**
     * If true (default), fetch a token on mount and schedule auto-refresh.
     * If false, no token is fetched until `getToken()` is called manually.
     */
    fetchInitialToken?: boolean;
    /**
     * Seconds before token expiry to proactively refresh. Default: 60.
     */
    tokenRefreshBuffer?: number;
    /**
     * Number of retry attempts on token fetch failure. Default: 3.
     */
    tokenRetry?: number;
    /**
     * Bring your own TanStack Query client. If omitted, the provider creates
     * an internal one. Use this when your app already wraps with QueryClientProvider.
     */
    queryClient?: QueryClient;
    debug?: boolean;
    children: React.ReactNode;
}
declare function FileNestProvider({ projectId, baseUrl, tokenEndpoint, tokenFetcher, fetchInitialToken, tokenRefreshBuffer, tokenRetry, queryClient, debug, children, }: FileNestProviderProps): React.JSX.Element;
declare function useFileNest(): FileNestContextValue;

/**
 * @filenest/react components/FileUpload — drag-and-drop and button file upload component.
 *
 * Fetches an upload token from the host app's token endpoint via `FileNestProvider`,
 * then uploads files with progress reporting. Supports dropzone, button, and minimal variants.
 *
 * @module
 */

type UploadVariant = "dropzone" | "button" | "minimal";
interface MetadataFormField {
    name: string;
    label: string;
    type: "text" | "select" | "textarea";
    options?: string[];
    required?: boolean;
}
interface FileUploadProps {
    accept?: string[];
    maxSize?: number;
    maxFiles?: number;
    multiple?: boolean;
    folderId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    metadataForm?: {
        fields: MetadataFormField[];
    };
    variant?: UploadVariant;
    placeholder?: string;
    showProgress?: boolean;
    showPreview?: boolean;
    onUploadStart?: (files: File[]) => void;
    onProgress?: (file: File, percentage: number) => void;
    onComplete?: (files: FileRecord[]) => void;
    onError?: (error: Error, filename: string) => void;
    onValidationError?: (errors: {
        message: string;
    }[]) => void;
    className?: string;
}
declare function FileUpload({ accept, maxSize, maxFiles, multiple, folderId, metadata, tags, variant, placeholder, showProgress, onUploadStart, onComplete, onError, onValidationError, className, }: FileUploadProps): React.JSX.Element;

/**
 * @filenest/react components/FilePreview — inline file preview panel.
 *
 * Renders images inline and PDFs via iframe. Full PDF.js integration
 * and Office preview are deferred to Phase 7.
 *
 * @module
 */

interface FilePreviewProps {
    fileId: string;
    showMetadata?: boolean;
    showVersionHistory?: boolean;
    allowDownload?: boolean;
    downloadTtl?: number;
    height?: string | number;
    width?: string | number;
    onClose?: () => void;
    onDownload?: (url: string) => void;
    onVersionSelect?: (versionNumber: number) => void;
}
declare function FilePreview({ fileId, showMetadata, showVersionHistory, allowDownload, height, width, onClose, onDownload, }: FilePreviewProps): React.JSX.Element | null;

/**
 * @filenest/react components/FileViewer — full-page document viewer wrapper.
 *
 * Wraps FilePreview with fullscreen/contained layout chrome and an optional
 * toolbar. Full PDF.js and annotation support are deferred to Phase 7.
 *
 * @module
 */

interface PdfViewerOptions {
    showPageNumbers?: boolean;
    enableSearch?: boolean;
    enableZoom?: boolean;
    defaultZoom?: "fit-width" | "fit-page" | "auto";
}
interface ImageViewerOptions {
    enableZoom?: boolean;
    enableRotate?: boolean;
}
interface FileViewerProps {
    fileId: string;
    showToolbar?: boolean;
    showSidebar?: boolean;
    pdf?: PdfViewerOptions;
    image?: ImageViewerOptions;
    layout?: "fullscreen" | "contained";
    onClose?: () => void;
}
declare function FileViewer({ fileId, showToolbar, layout, onClose, }: FileViewerProps): React.JSX.Element;

/**
 * @filenest/react hooks/useUpload — programmatic upload with per-file progress state.
 * @module
 */

type UploadStatus = "pending" | "uploading" | "success" | "failed";
interface UploadState {
    id: string;
    filename: string;
    status: UploadStatus;
    progress: number;
    file: FileRecord | null;
    error: Error | null;
}
interface UseUploadOptions {
    folderId?: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    onComplete?: (file: FileRecord) => void;
    onError?: (error: Error, filename: string) => void;
}
declare function useUpload(options?: UseUploadOptions): {
    upload: (files: File[]) => Promise<void>;
    uploads: UploadState[];
    isUploading: boolean;
    cancel: (id: string) => void;
    retry: (id: string) => Promise<void>;
    clear: () => void;
};

/**
 * @filenest/react hooks/useUploadToken — reactive upload token state.
 *
 * Returns the current cached token, loading state, and a `refresh()` function
 * that forces a new fetch from the token endpoint regardless of expiry.
 *
 * Useful when `fetchInitialToken=false` on the provider (manual token mode)
 * or when you need to display token metadata in your UI.
 *
 * @module
 */
interface UseUploadTokenResult {
    /** Current cached token string, or null if not yet fetched. */
    token: string | null;
    /** True while a token fetch is in-flight. */
    isLoading: boolean;
    /** Last fetch error, or null if the last fetch succeeded. */
    error: Error | null;
    /**
     * Force-fetch a fresh token from the endpoint.
     * Returns the new token string. Clears the cache first.
     */
    refresh: () => Promise<string>;
}
declare function useUploadToken(): UseUploadTokenResult;

interface UseFilesOptions {
    folderId?: string | null;
    filters?: SearchFilters & {
        metadata?: Record<string, string>;
    };
    tags?: string[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    enabled?: boolean;
}
declare function useFiles(options?: UseFilesOptions): {
    files: FileRecord[];
    totalCount: number;
    hasMore: boolean;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    loadMore: () => void;
    refresh: () => Promise<_tanstack_react_query.QueryObserverResult<NoInfer<ListResponse<FileRecord>>, Error>>;
};

/**
 * @filenest/react hooks/useFile — single file detail with revalidation.
 * @module
 */

interface UseFileOptions {
    includeVersions?: boolean;
    includeProcessing?: boolean;
    enabled?: boolean;
}
declare function useFile(fileId: string, options?: UseFileOptions): {
    file: NoInfer<FileRecord> | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    mutate: () => void;
};

/**
 * @filenest/react hooks/useSearch — debounced full-text + faceted search.
 * @module
 */

interface UseSearchOptions {
    debounceMs?: number;
    facets?: string[];
    limit?: number;
}
declare function useSearch(options?: UseSearchOptions): {
    results: SearchHit[];
    facets: SearchFacets | undefined;
    isLoading: boolean;
    totalCount: number;
    queryTimeMs: number;
    search: (query: SearchQuery) => void;
    hasMore: boolean;
};

/**
 * @filenest/react hooks/useFolder — folder navigation with breadcrumbs.
 * @module
 */

interface Breadcrumb {
    id: string | null;
    name: string;
}
interface UseFolderResult {
    folder: Folder | null;
    files: FileRecord[];
    subfolders: Folder[];
    isLoading: boolean;
    breadcrumbs: Breadcrumb[];
}
declare function useFolder(folderId: string | null): UseFolderResult;

interface UseInfiniteFilesOptions {
    folderId?: string | null;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    searchQuery?: string;
    limit?: number;
    enabled?: boolean;
}
declare function useInfiniteFiles(opts?: UseInfiniteFilesOptions): {
    files: FileRecord[];
    totalCount: number;
    hasMore: boolean;
    isLoading: boolean;
    isFetchingMore: boolean;
    fetchMore: (options?: _tanstack_react_query.FetchNextPageOptions) => Promise<_tanstack_react_query.InfiniteQueryObserverResult<_tanstack_react_query.InfiniteData<ListResponse<FileRecord>, unknown>, Error>>;
    refresh: (options?: _tanstack_react_query.RefetchOptions) => Promise<_tanstack_react_query.QueryObserverResult<_tanstack_react_query.InfiniteData<ListResponse<FileRecord>, unknown>, Error>>;
};

export { type Breadcrumb, type ConfirmUploadResult, type SearchResults$1 as CoreSearchResults, type CreateFolderOptions, type DownloadUrlOptions, type DownloadUrlResult, type FileListFilters, type FileNestContextValue, FileNestProvider, type FileNestProviderProps, FilePreview, type FilePreviewProps, type FileRecord, type FileStatus, type FileUpdateOptions, FileUpload, type FileUploadProps, type FileVersion, FileViewer, type FileViewerProps, type Folder, type FolderListOptions, type InitUploadOptions, type InitUploadResult, type ListResponse, type MetadataFormField, type Project, type SearchFacets, type SearchFilters, type SearchHit, type SearchQuery, type SearchResults, type UploadOptions, type UploadProgress, type UploadState, type UploadStatus, type UploadToStorageOptions, type UploadToken, type UseFileOptions, type UseFilesOptions, type UseFolderResult, type UseInfiniteFilesOptions, type UseSearchOptions, type UseUploadOptions, type UseUploadTokenResult, type Webhook, useFile, useFileNest, useFiles, useFolder, useInfiniteFiles, useSearch, useUpload, useUploadToken };
