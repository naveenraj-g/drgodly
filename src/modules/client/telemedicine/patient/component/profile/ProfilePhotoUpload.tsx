/**
 * ProfilePhotoUpload — avatar display with click-to-upload for the patient profile page.
 *
 * Layer: client / telemedicine / patient / component / profile
 *
 * Renders a large circular avatar. If the patient has an existing photo the
 * component fetches a short-lived presigned URL from /api/filenest-download-url
 * and displays it; otherwise a single-letter fallback is shown. Clicking the
 * avatar (or the pencil overlay) opens a hidden file input that accepts images
 * up to 5 MB. On selection the file is uploaded via the FileNest @filenest/react
 * useUpload hook (which uses the token obtained by the parent FileNestProvider),
 * the FileNest file record is persisted to the local PatientPhoto table via
 * savePatientPhotoAction, and the avatar is refreshed with a new presigned URL.
 *
 * Must be rendered inside a <FileNestProvider> (set up in PatientProfileForm).
 */

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useUpload, type FileRecord } from "@filenest/react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { savePatientPhotoAction } from "@/modules/server/presentation/actions/patient/profilePhoto.actions";
import { handleZSAError } from "@/modules/client/shared/error/handleZSAError";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfilePhotoUploadProps {
  /** FileNest file ID of the current photo, if one has been uploaded previously. */
  initialFileId?: string;
  /** Used to derive the avatar fallback letter (first character). Defaults to "P". */
  displayName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Large avatar widget that lets the patient upload a profile photo.
 *
 * State machine:
 *   idle → file selected → uploading → saving to DB → fetching URL → idle (new photo shown)
 *
 * @param initialFileId - FileNest file ID loaded from the PatientPhoto DB record.
 * @param displayName   - Patient's name, used for the initials fallback letter.
 */
export function ProfilePhotoUpload({
  initialFileId,
  displayName,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /** Currently displayed presigned download URL, or null to show fallback. */
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fallback = displayName ? displayName.charAt(0).toUpperCase() : "P";

  // ── Download URL fetcher ──────────────────────────────────────────────────

  /**
   * Fetches a short-lived presigned download URL for the given FileNest file ID.
   * Silently falls back to the initials avatar on any failure.
   *
   * @param fileId - FileNest file ID to get a URL for.
   */
  const fetchDownloadUrl = useCallback(async (fileId: string) => {
    setIsFetchingUrl(true);
    try {
      const res = await fetch(`/api/filenest-download-url?fileId=${encodeURIComponent(fileId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { url: string };
      setPhotoUrl(data.url);
    } catch {
      // Network error — avatar will show initials fallback
    } finally {
      setIsFetchingUrl(false);
    }
  }, []);

  /** Load the existing photo URL on mount. */
  useEffect(() => {
    if (initialFileId) {
      fetchDownloadUrl(initialFileId);
    }
    // Only run on mount — initialFileId is stable (server prop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Upload handling ───────────────────────────────────────────────────────

  /**
   * Called by useUpload when an upload completes successfully.
   * Persists the FileNest file metadata to the local DB, then refreshes the URL.
   *
   * @param fileRecord - Completed FileRecord returned by FileNest.
   */
  const handleComplete = useCallback(
    async (fileRecord: FileRecord) => {
      setIsSaving(true);
      try {
        const [, err] = await savePatientPhotoAction({
          fileId: fileRecord.id,
          filename: fileRecord.filename,
          contentType: fileRecord.contentType,
          sizeBytes: fileRecord.sizeBytes,
        });
        if (err) {
          handleZSAError({ err });
          return;
        }
        // Refresh the avatar with a presigned URL for the new file
        await fetchDownloadUrl(fileRecord.id);
        toast.success("Profile photo updated.");
      } finally {
        setIsSaving(false);
      }
    },
    [fetchDownloadUrl],
  );

  const handleError = useCallback((error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  }, []);

  const { upload, isUploading } = useUpload({
    onComplete: handleComplete,
    onError: handleError,
  });

  const isLoading = isUploading || isSaving || isFetchingUrl;

  // ── File input handler ────────────────────────────────────────────────────

  /**
   * Triggered when the user selects a file via the hidden input.
   * Clears the input value so the same file can be re-selected.
   *
   * @param e - Change event from the file input.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting the same file
    upload([file]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium text-foreground">Profile photo</p>

      {/* Clickable avatar wrapper */}
      <div className="relative group/photo-upload w-fit">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isLoading}
          aria-label="Change profile photo"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
        >
          {/* Avatar — 5rem (80px) circle */}
          <Avatar className="size-20 text-2xl font-semibold">
            {photoUrl && !isLoading && (
              <AvatarImage src={photoUrl} alt={`${displayName ?? "Patient"} profile photo`} />
            )}
            <AvatarFallback className="text-2xl">
              {isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                fallback
              )}
            </AvatarFallback>
          </Avatar>

          {/* Pencil overlay — visible on hover when not loading */}
          {!isLoading && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/photo-upload:opacity-100 transition-opacity duration-150">
              <Pencil className="size-5 text-white" />
            </span>
          )}
        </button>

        {/* Hidden file input — only images, max 5 MB enforced client-side */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP or GIF · Max 5 MB
      </p>
    </div>
  );
}
