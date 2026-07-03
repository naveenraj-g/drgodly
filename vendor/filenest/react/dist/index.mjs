"use client";

// src/context/FileNestContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jsx } from "react/jsx-runtime";
var FileNestContext = createContext(null);
var defaultQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 3e4, retry: 2 } }
});
function FileNestProvider({
  projectId,
  baseUrl = "",
  tokenEndpoint = "",
  tokenFetcher,
  fetchInitialToken = true,
  tokenRefreshBuffer = 60,
  tokenRetry = 3,
  queryClient,
  debug = false,
  children
}) {
  const api = baseUrl.replace(/\/$/, "");
  const [token, setToken] = useState(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const tokenRef = useRef(null);
  const inflightRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const doFetch = useCallback(async () => {
    if (tokenFetcher) return tokenFetcher();
    if (tokenEndpoint) {
      const res = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
      return res.json();
    }
    return { token: "", expiresAt: new Date(Date.now() + 36e5).toISOString() };
  }, [tokenEndpoint, tokenFetcher]);
  const fetchToken = useCallback(async () => {
    let attempt = 0;
    let lastErr = new Error("Unknown error");
    while (attempt < tokenRetry) {
      try {
        const data = await doFetch();
        const expiresAt = new Date(data.expiresAt).getTime();
        tokenRef.current = { token: data.token, expiresAt };
        setToken(data.token);
        setTokenError(null);
        const ttl = expiresAt - Date.now() - tokenRefreshBuffer * 1e3;
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (ttl > 0) {
          refreshTimerRef.current = setTimeout(() => {
            fetchToken().catch((e) => {
              if (debug) console.error("[FileNest] Token refresh failed:", e);
            });
          }, ttl);
        }
        return data.token;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        attempt++;
        if (attempt < tokenRetry) await sleep(attempt * 500);
      }
    }
    setTokenError(lastErr);
    if (debug) console.error("[FileNest] Token fetch failed after retries:", lastErr);
    throw lastErr;
  }, [doFetch, tokenRetry, tokenRefreshBuffer, debug]);
  const getToken = useCallback(async () => {
    const cached = tokenRef.current;
    if (cached && cached.expiresAt - Date.now() > tokenRefreshBuffer * 1e3) {
      return cached.token;
    }
    if (inflightRef.current) return inflightRef.current;
    setIsTokenLoading(true);
    const p = fetchToken().finally(() => {
      inflightRef.current = null;
      setIsTokenLoading(false);
    });
    inflightRef.current = p;
    return p;
  }, [fetchToken, tokenRefreshBuffer]);
  useEffect(() => {
    if (!fetchInitialToken) {
      setIsReady(true);
      return;
    }
    getToken().then(() => setIsReady(true)).catch(() => setIsReady(true));
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);
  const callApi = useCallback(
    async (method, path, options) => {
      const tok = await getToken();
      const url = buildUrl(`${api}/v1/projects/${projectId}${path}`, options?.params);
      const headers = {
        Authorization: `Bearer ${tok}`
      };
      if (options?.body !== void 0) headers["Content-Type"] = "application/json";
      const doRequest = async (authToken) => fetch(url, {
        method,
        headers: { ...headers, Authorization: `Bearer ${authToken}` },
        ...options?.body !== void 0 ? { body: JSON.stringify(options.body) } : {}
      });
      let res = await doRequest(tok);
      if (res.status === 401) {
        tokenRef.current = null;
        const freshToken = await fetchToken();
        res = await doRequest(freshToken);
      }
      if (res.status === 204) return void 0;
      if (!res.ok) {
        let message = `${method} ${path} failed: ${res.statusText}`;
        try {
          const errBody = await res.json();
          if (errBody.message) message = errBody.message;
        } catch {
        }
        const err = new Error(message);
        err.status = res.status;
        throw err;
      }
      return res.json();
    },
    [getToken, fetchToken, api, projectId]
  );
  const initUpload = useCallback(
    async (opts) => {
      const raw = await callApi(
        "POST",
        "/files/upload",
        {
          body: {
            filename: opts.filename,
            content_type: opts.contentType,
            size_bytes: opts.sizeBytes,
            folder_id: opts.folderId ?? null,
            metadata: opts.metadata ?? {},
            tags: opts.tags ?? []
          }
        }
      );
      return { fileId: raw.file_id, uploadUrl: raw.upload_url, expiresAt: raw.expires_at };
    },
    [callApi]
  );
  const uploadToStorage = useCallback(
    async (url, file, opts = {}) => {
      const contentType = file instanceof File ? file.type || "application/octet-stream" : "application/octet-stream";
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && opts.onProgress) {
            opts.onProgress({
              bytesUploaded: e.loaded,
              totalBytes: e.total,
              percentage: Math.round(e.loaded / e.total * 100),
              chunkNumber: 1,
              totalChunks: 1
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during storage upload"));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.send(file);
      });
    },
    []
  );
  const confirmUpload = useCallback(
    async (fileId) => callApi("POST", `/files/${fileId}/confirm`),
    [callApi]
  );
  const upload = useCallback(
    async (file, opts = {}) => {
      const { fileId, uploadUrl } = await initUpload({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        folderId: opts.folderId,
        metadata: opts.metadata,
        tags: opts.tags
      });
      await uploadToStorage(uploadUrl, file, { onProgress: opts.onProgress });
      await confirmUpload(fileId);
      return callApi("GET", `/files/${fileId}`);
    },
    [initUpload, uploadToStorage, confirmUpload, callApi]
  );
  const listFiles = useCallback(
    async (filters = {}) => {
      return callApi("GET", "/files", {
        params: {
          folder_id: filters.folderId !== void 0 ? filters.folderId ?? "root" : void 0,
          mime_type: filters.mimeType,
          status: filters.status,
          sort_by: filters.sortBy,
          sort_order: filters.sortOrder,
          limit: filters.limit,
          offset: filters.offset,
          tags: filters.tags?.join(","),
          metadata: filters.metadata ? JSON.stringify(filters.metadata) : void 0
        }
      });
    },
    [callApi]
  );
  const getFile = useCallback(
    async (fileId) => callApi("GET", `/files/${fileId}`),
    [callApi]
  );
  const deleteFile = useCallback(
    async (fileId) => callApi("DELETE", `/files/${fileId}`),
    [callApi]
  );
  const updateFile = useCallback(
    async (fileId, opts) => callApi("PATCH", `/files/${fileId}`, { body: opts }),
    [callApi]
  );
  const getDownloadUrl = useCallback(
    async (fileId, opts = {}) => callApi("GET", `/files/${fileId}/download`, {
      params: { ttl: opts.ttl, disposition: opts.disposition }
    }),
    [callApi]
  );
  const listFolders = useCallback(
    async (opts = {}) => callApi("GET", "/folders", {
      params: {
        parent_folder_id: opts.parentFolderId ?? void 0,
        name: opts.name,
        limit: opts.limit,
        offset: opts.offset
      }
    }),
    [callApi]
  );
  const createFolder = useCallback(
    async (opts) => callApi("POST", "/folders", {
      body: { name: opts.name, parent_folder_id: opts.parentFolderId ?? null }
    }),
    [callApi]
  );
  const getFolder = useCallback(
    async (folderId) => callApi("GET", `/folders/${folderId}`),
    [callApi]
  );
  const getFolderByPath = useCallback(
    async (path) => {
      try {
        return await callApi("GET", "/folders/by-path", {
          params: { path }
        });
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    [callApi]
  );
  const deleteFolder = useCallback(
    async (folderId) => callApi("DELETE", `/folders/${folderId}`),
    [callApi]
  );
  const ensurePath = useCallback(
    async (path) => callApi("POST", "/folders/ensure-path", { body: { path } }),
    [callApi]
  );
  const search = useCallback(
    async (query) => {
      const t0 = Date.now();
      const data = await callApi(
        "POST",
        "/search",
        { body: { ...query, limit: query.limit ?? 20 } }
      );
      return { ...data, queryTimeMs: Date.now() - t0 };
    },
    [callApi]
  );
  const value = {
    projectId,
    baseUrl: api,
    debug,
    tokenEndpoint,
    token,
    isTokenLoading,
    tokenError,
    isReady,
    getToken,
    initUpload,
    uploadToStorage,
    confirmUpload,
    upload,
    listFiles,
    getFile,
    deleteFile,
    updateFile,
    getDownloadUrl,
    listFolders,
    createFolder,
    getFolder,
    getFolderByPath,
    deleteFolder,
    ensurePath,
    search
  };
  const qc = queryClient ?? defaultQueryClient;
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: qc, children: /* @__PURE__ */ jsx(FileNestContext.Provider, { value, children }) });
}
function useFileNest() {
  const ctx = useContext(FileNestContext);
  if (!ctx) throw new Error("useFileNest must be used inside <FileNestProvider>");
  return ctx;
}
function buildUrl(base, params) {
  if (!params) return base;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0) qs.set(k, String(v));
  }
  const str = qs.toString();
  return str ? `${base}?${str}` : base;
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/components/FileUpload.tsx
import { useCallback as useCallback3, useRef as useRef2, useState as useState3 } from "react";

// src/hooks/useUpload.ts
import { useCallback as useCallback2, useState as useState2 } from "react";
function useUpload(options = {}) {
  const { upload: contextUpload } = useFileNest();
  const [uploads, setUploads] = useState2([]);
  const updateUpload = (id, patch) => {
    setUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u));
  };
  const upload = useCallback2(
    async (files) => {
      const newUploads = files.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        filename: f.name,
        status: "pending",
        progress: 0,
        file: null,
        error: null
      }));
      setUploads((prev) => [...prev, ...newUploads]);
      await Promise.allSettled(
        newUploads.map(async (state, i) => {
          updateUpload(state.id, { status: "uploading" });
          try {
            const file = await contextUpload(files[i], {
              folderId: options.folderId,
              metadata: options.metadata,
              tags: options.tags,
              onProgress: (p) => updateUpload(state.id, { progress: p.percentage })
            });
            updateUpload(state.id, { status: "success", progress: 100, file });
            options.onComplete?.(file);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            updateUpload(state.id, { status: "failed", error });
            options.onError?.(error, state.filename);
          }
        })
      );
    },
    [contextUpload, options]
  );
  const cancel = useCallback2((id) => {
    updateUpload(id, { status: "failed", error: new Error("Cancelled") });
  }, []);
  const retry = useCallback2(
    async (id) => {
      const state = uploads.find((u) => u.id === id);
      if (!state) return;
      updateUpload(id, { status: "pending", progress: 0, error: null });
    },
    [uploads]
  );
  const clear = useCallback2(() => setUploads([]), []);
  return {
    upload,
    uploads,
    isUploading: uploads.some((u) => u.status === "uploading"),
    cancel,
    retry,
    clear
  };
}

// src/components/FileUpload.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function FileUpload({
  accept,
  maxSize,
  maxFiles = 10,
  multiple = true,
  folderId,
  metadata,
  tags,
  variant = "dropzone",
  placeholder = "Drag and drop files here, or click to browse",
  showProgress = true,
  onUploadStart,
  onComplete,
  onError,
  onValidationError,
  className
}) {
  const [isDragging, setIsDragging] = useState3(false);
  const inputRef = useRef2(null);
  const { upload, uploads, isUploading } = useUpload({
    folderId,
    metadata,
    tags,
    onComplete: (file) => {
      const allDone = uploads.filter((u) => u.status === "success").length + 1 === uploads.length;
      if (allDone) {
        const completed = uploads.filter((u) => u.status === "success" && u.file).map((u) => u.file);
        onComplete?.([...completed, file]);
      }
    },
    onError
  });
  const validate = (files) => {
    const errors = [];
    const valid = files.filter((f) => {
      if (maxSize && f.size > maxSize) {
        errors.push({ message: `${f.name} exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)} MB` });
        return false;
      }
      if (accept && accept.length > 0) {
        const matches = accept.some((a) => {
          if (a.endsWith("/*")) return f.type.startsWith(a.replace("/*", "/"));
          return f.type === a;
        });
        if (!matches) {
          errors.push({ message: `${f.name} has unsupported file type` });
          return false;
        }
      }
      return true;
    });
    return { valid, errors };
  };
  const handleFiles = useCallback3(
    (files) => {
      const capped = files.slice(0, maxFiles);
      const { valid, errors } = validate(capped);
      if (errors.length) onValidationError?.(errors);
      if (!valid.length) return;
      onUploadStart?.(valid);
      upload(valid);
    },
    [upload, maxFiles, onUploadStart, onValidationError]
  );
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };
  const onChange = (e) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
  };
  const acceptAttr = accept?.join(",");
  if (variant === "button") {
    return /* @__PURE__ */ jsxs("div", { className, children: [
      /* @__PURE__ */ jsx2("input", { ref: inputRef, type: "file", accept: acceptAttr, multiple, onChange, style: { display: "none" } }),
      /* @__PURE__ */ jsx2("button", { type: "button", onClick: () => inputRef.current?.click(), disabled: isUploading, children: isUploading ? "Uploading\u2026" : "Upload files" }),
      showProgress && /* @__PURE__ */ jsx2(UploadProgressList, { uploads })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className, children: [
    /* @__PURE__ */ jsx2("input", { ref: inputRef, type: "file", accept: acceptAttr, multiple, onChange, style: { display: "none" } }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        role: "button",
        tabIndex: 0,
        onDragOver,
        onDragLeave,
        onDrop,
        onClick: () => inputRef.current?.click(),
        onKeyDown: (e) => e.key === "Enter" && inputRef.current?.click(),
        style: {
          border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          cursor: "pointer",
          background: isDragging ? "rgba(59,130,246,0.05)" : "transparent",
          transition: "all 0.15s ease"
        },
        "aria-label": "File upload area",
        children: [
          /* @__PURE__ */ jsx2("p", { style: { margin: 0, color: "#6b7280" }, children: placeholder }),
          accept && /* @__PURE__ */ jsxs("p", { style: { margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }, children: [
            "Accepted: ",
            accept.join(", ")
          ] }),
          maxSize && /* @__PURE__ */ jsxs("p", { style: { margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }, children: [
            "Max size: ",
            Math.round(maxSize / 1024 / 1024),
            " MB"
          ] })
        ]
      }
    ),
    showProgress && /* @__PURE__ */ jsx2(UploadProgressList, { uploads })
  ] });
}
function UploadProgressList({ uploads }) {
  if (!uploads.length) return null;
  return /* @__PURE__ */ jsx2("ul", { style: { listStyle: "none", margin: "8px 0 0", padding: 0 }, children: uploads.map((u) => /* @__PURE__ */ jsxs("li", { style: { marginBottom: 6 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 13 }, children: [
      /* @__PURE__ */ jsx2("span", { children: u.filename }),
      /* @__PURE__ */ jsx2("span", { style: { color: u.status === "failed" ? "#ef4444" : u.status === "success" ? "#22c55e" : "#6b7280" }, children: u.status === "uploading" ? `${u.progress}%` : u.status })
    ] }),
    u.status === "uploading" && /* @__PURE__ */ jsx2("div", { style: { height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden", marginTop: 3 }, children: /* @__PURE__ */ jsx2("div", { style: { height: "100%", width: `${u.progress}%`, background: "#3b82f6", transition: "width 0.1s" } }) })
  ] }, u.id)) });
}

// src/components/FilePreview.tsx
import React3 from "react";

// src/hooks/useFile.ts
import { useCallback as useCallback4 } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
function useFile(fileId, options = {}) {
  const { projectId, getFile } = useFileNest();
  const queryClient = useQueryClient();
  const queryKey = ["filenest", "file", projectId, fileId, options];
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => getFile(fileId),
    enabled: !!fileId && options.enabled !== false
  });
  const mutate = useCallback4(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);
  return {
    file: data ?? null,
    isLoading,
    isError,
    error,
    mutate
  };
}

// src/components/FilePreview.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function FilePreview({
  fileId,
  showMetadata = true,
  showVersionHistory = false,
  allowDownload = true,
  height = 480,
  width = "100%",
  onClose,
  onDownload
}) {
  const { file, isLoading } = useFile(fileId, { includeVersions: showVersionHistory });
  const { projectId, baseUrl, getToken } = useFileNest();
  const handleDownload = async () => {
    const token = await getToken();
    const res = await fetch(`${baseUrl}/v1/projects/${projectId}/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { url } = await res.json();
    if (onDownload) {
      onDownload(url);
    } else {
      window.open(url, "_blank");
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx3("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height, width }, children: /* @__PURE__ */ jsx3("span", { style: { color: "#9ca3af" }, children: "Loading preview\u2026" }) });
  }
  if (!file) return null;
  return /* @__PURE__ */ jsxs2("div", { style: { width, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs2("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }, children: [
      /* @__PURE__ */ jsx3("span", { style: { fontSize: 14, fontWeight: 500 }, children: file.filename }),
      /* @__PURE__ */ jsxs2("div", { style: { display: "flex", gap: 8 }, children: [
        allowDownload && /* @__PURE__ */ jsx3("button", { type: "button", style: headerBtn, onClick: handleDownload, children: "Download" }),
        onClose && /* @__PURE__ */ jsx3("button", { type: "button", style: headerBtn, onClick: onClose, children: "\u2715" })
      ] })
    ] }),
    /* @__PURE__ */ jsx3(PreviewContent, { file, height: typeof height === "number" ? height - 44 : 360, projectId, baseUrl, getToken }),
    showMetadata && Object.keys(file.metadata ?? {}).length > 0 && /* @__PURE__ */ jsxs2("div", { style: { padding: "10px 14px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }, children: [
      /* @__PURE__ */ jsx3("p", { style: { margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }, children: "Metadata" }),
      /* @__PURE__ */ jsx3("dl", { style: { margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 12px" }, children: Object.entries(file.metadata).map(([k, v]) => /* @__PURE__ */ jsxs2(React3.Fragment, { children: [
        /* @__PURE__ */ jsx3("dt", { style: { fontSize: 12, color: "#6b7280" }, children: k }),
        /* @__PURE__ */ jsx3("dd", { style: { margin: 0, fontSize: 12 }, children: String(v) })
      ] }, k)) })
    ] })
  ] });
}
function PreviewContent({
  file,
  height,
  projectId,
  baseUrl,
  getToken
}) {
  const [downloadUrl, setDownloadUrl] = React3.useState(null);
  React3.useEffect(() => {
    getToken().then(
      (token) => fetch(`${baseUrl}/v1/projects/${projectId}/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ).then((r) => r.json()).then((d) => setDownloadUrl(d.url)).catch(() => {
    });
  }, [file.id, projectId, getToken]);
  if (!downloadUrl) {
    return /* @__PURE__ */ jsx3("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsx3("span", { style: { color: "#9ca3af", fontSize: 13 }, children: "Loading\u2026" }) });
  }
  if (file.contentType.startsWith("image/")) {
    return /* @__PURE__ */ jsx3("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }, children: /* @__PURE__ */ jsx3("img", { src: downloadUrl, alt: file.filename, style: { maxWidth: "100%", maxHeight: height, objectFit: "contain" } }) });
  }
  if (file.contentType === "application/pdf") {
    return /* @__PURE__ */ jsx3("iframe", { src: downloadUrl, title: file.filename, style: { width: "100%", height, border: "none" } });
  }
  return /* @__PURE__ */ jsxs2("div", { style: { height, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsx3("span", { style: { fontSize: 32 }, children: "\u{1F4C4}" }),
    /* @__PURE__ */ jsxs2("span", { style: { color: "#6b7280", fontSize: 13 }, children: [
      file.contentType,
      " \u2014 no preview available"
    ] })
  ] });
}
var headerBtn = {
  background: "none",
  border: "1px solid #d1d5db",
  borderRadius: 5,
  padding: "4px 10px",
  fontSize: 12,
  cursor: "pointer"
};

// src/components/FileViewer.tsx
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function FileViewer({
  fileId,
  showToolbar = true,
  layout = "contained",
  onClose
}) {
  const containerStyle = layout === "fullscreen" ? { position: "fixed", inset: 0, background: "#111827", zIndex: 9999, display: "flex", flexDirection: "column" } : { width: "100%", height: "100%", display: "flex", flexDirection: "column" };
  return /* @__PURE__ */ jsxs3("div", { style: containerStyle, children: [
    showToolbar && onClose && /* @__PURE__ */ jsx4("div", { style: { display: "flex", justifyContent: "flex-end", padding: "8px 12px", background: "#1f2937" }, children: /* @__PURE__ */ jsx4("button", { type: "button", onClick: onClose, style: { background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }, children: "\u2715" }) }),
    /* @__PURE__ */ jsx4("div", { style: { flex: 1, overflow: "auto" }, children: /* @__PURE__ */ jsx4(
      FilePreview,
      {
        fileId,
        showMetadata: false,
        showVersionHistory: false,
        allowDownload: true,
        height: "100%",
        width: "100%",
        onClose
      }
    ) })
  ] });
}

// src/hooks/useUploadToken.ts
function useUploadToken() {
  const { token, isTokenLoading, tokenError, getToken } = useFileNest();
  return {
    token,
    isLoading: isTokenLoading,
    error: tokenError,
    refresh: getToken
  };
}

// src/hooks/useFiles.ts
import { useState as useState4 } from "react";
import { useQuery as useQuery2 } from "@tanstack/react-query";
function useFiles(options = {}) {
  const { projectId, listFiles } = useFileNest();
  const [offset, setOffset] = useState4(0);
  const limit = options.limit ?? 20;
  const { data, isLoading, isError, error, refetch } = useQuery2({
    queryKey: ["filenest", "files", projectId, options, offset],
    queryFn: () => listFiles({
      folderId: options.folderId,
      tags: options.tags,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      metadata: options.filters?.metadata,
      limit,
      offset
    }),
    enabled: options.enabled !== false
  });
  return {
    files: data?.items ?? [],
    totalCount: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    isLoading,
    isError,
    error,
    loadMore: () => setOffset((o) => o + limit),
    refresh: () => refetch()
  };
}

// src/hooks/useSearch.ts
import { useCallback as useCallback5, useRef as useRef3, useState as useState5 } from "react";
import { useQuery as useQuery3, useQueryClient as useQueryClient2 } from "@tanstack/react-query";
function useSearch(options = {}) {
  const { projectId, search: contextSearch } = useFileNest();
  const queryClient = useQueryClient2();
  const debounceMs = options.debounceMs ?? 300;
  const [currentQuery, setCurrentQuery] = useState5({});
  const [queryTimeMs, setQueryTimeMs] = useState5(0);
  const debounceTimer = useRef3(null);
  const queryKey = ["filenest", "search", projectId, currentQuery, options.facets];
  const { data, isLoading } = useQuery3({
    queryKey,
    queryFn: async () => {
      if (!currentQuery.q && !Object.keys(currentQuery.filters ?? {}).length) {
        return { hits: [], total: 0, facets: void 0, queryTimeMs: 0 };
      }
      const result = await contextSearch({
        ...currentQuery,
        limit: options.limit ?? 20
      });
      setQueryTimeMs(result.queryTimeMs);
      return result;
    },
    enabled: true
  });
  const search = useCallback5(
    (query) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setCurrentQuery(query);
        queryClient.invalidateQueries({ queryKey: ["filenest", "search", projectId] });
      }, debounceMs);
    },
    [debounceMs, projectId, queryClient]
  );
  return {
    results: data?.hits ?? [],
    facets: data?.facets,
    isLoading,
    totalCount: data?.total ?? 0,
    queryTimeMs,
    search,
    hasMore: (data?.hits?.length ?? 0) < (data?.total ?? 0)
  };
}

// src/hooks/useFolder.ts
import { useQuery as useQuery4 } from "@tanstack/react-query";
function useFolder(folderId) {
  const { projectId, getFolder, listFiles, listFolders } = useFileNest();
  const { data, isLoading } = useQuery4({
    queryKey: ["filenest", "folder", projectId, folderId],
    queryFn: async () => {
      const [folderData, filesData, subfoldersData] = await Promise.all([
        folderId ? getFolder(folderId) : Promise.resolve(null),
        listFiles({ folderId: folderId ?? null, limit: 100 }),
        listFolders({ parentFolderId: folderId ?? null })
      ]);
      return {
        folder: folderData,
        files: filesData.items,
        subfolders: subfoldersData.items
      };
    }
  });
  const buildBreadcrumbs = () => {
    const crumbs = [{ id: null, name: "Root" }];
    if (data?.folder) {
      const parts = data.folder.path.split("/").filter(Boolean);
      parts.forEach((name, i) => {
        crumbs.push({ id: i < parts.length - 1 ? `path-${i}` : data.folder.id, name });
      });
    }
    return crumbs;
  };
  return {
    folder: data?.folder ?? null,
    files: data?.files ?? [],
    subfolders: data?.subfolders ?? [],
    isLoading,
    breadcrumbs: buildBreadcrumbs()
  };
}

// src/hooks/useInfiniteFiles.ts
import { useInfiniteQuery } from "@tanstack/react-query";
function useInfiniteFiles(opts = {}) {
  const { projectId, listFiles } = useFileNest();
  const limit = opts.limit ?? 50;
  const query = useInfiniteQuery({
    queryKey: [
      "filenest",
      "files-infinite",
      projectId,
      opts.folderId ?? "root",
      opts.sortBy,
      opts.sortOrder,
      opts.searchQuery
    ],
    queryFn: ({ pageParam = 0 }) => listFiles({
      folderId: opts.folderId,
      sortBy: opts.sortBy,
      sortOrder: opts.sortOrder,
      limit,
      offset: pageParam
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + lastPage.limit;
      return next < lastPage.total ? next : void 0;
    },
    enabled: opts.enabled !== false
  });
  return {
    files: query.data?.pages.flatMap((p) => p.items) ?? [],
    totalCount: query.data?.pages[0]?.total ?? 0,
    hasMore: query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    fetchMore: query.fetchNextPage,
    refresh: query.refetch
  };
}
export {
  FileNestProvider,
  FilePreview,
  FileUpload,
  FileViewer,
  useFile,
  useFileNest,
  useFiles,
  useFolder,
  useInfiniteFiles,
  useSearch,
  useUpload,
  useUploadToken
};
//# sourceMappingURL=index.mjs.map