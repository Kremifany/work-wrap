"use client";

import { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { Camera, X } from "lucide-react";
import type { JobPhoto } from "@/types";

interface PhotoUploadProps {
  businessId: string;
  photos: JobPhoto[];
  onChange: (photos: JobPhoto[]) => void;
  max?: number;
}

interface UploadProgress {
  file: File;
  progress: number;
  error?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB


export default function PhotoUpload({
  businessId,
  photos,
  onChange,
  max = 20,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = (file: File): Promise<JobPhoto> => {
    return new Promise((resolve, reject) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        reject(new Error("Only JPEG, PNG, WebP or HEIC images are allowed."));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error("File too large. Max 15 MB per photo."));
        return;
      }

      const path = `businesses/${businessId}/jobs/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploading((prev) =>
            prev.map((u) => (u.file === file ? { ...u, progress: pct } : u))
          );
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ url, caption: file.name.replace(/\.[^.]+$/, "") });
        }
      );
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = max - photos.length;
    if (remaining <= 0) {
      setError(`Max ${max} photos allowed.`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    const newUploads: UploadProgress[] = selected.map((f) => ({
      file: f,
      progress: 0,
    }));
    setUploading((prev) => [...prev, ...newUploads]);

    const results = await Promise.allSettled(selected.map(uploadFile));

    const uploaded: JobPhoto[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        uploaded.push(r.value);
      } else {
        setUploading((prev) =>
          prev.map((u) =>
            u.file === selected[i]
              ? { ...u, error: r.reason?.message ?? "Upload failed" }
              : u
          )
        );
      }
    });

    if (uploaded.length > 0) {
      onChange([...photos, ...uploaded]);
    }

    setUploading((prev) =>
      prev.filter((u) => selected.every((f) => f !== u.file || u.error))
    );
  };

  const removePhoto = (index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  const updateCaption = (index: number, caption: string) => {
    onChange(photos.map((p, i) => (i === index ? { ...p, caption } : p)));
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Uploaded photos grid */}
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((photo, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || `Photo ${i + 1}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-1.5">
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="w-7 h-7 rounded-full bg-error-600 text-white flex items-center justify-center hover:bg-error-700 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={photo.caption}
                onChange={(e) => updateCaption(i, e.target.value)}
                placeholder="Caption…"
                className="fp-input w-full text-xs rounded-none border-0 border-t border-neutral-200 py-1"
                maxLength={100}
              />
            </div>
          ))}
        </div>
      )}

      {/* In-progress uploads */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((u, i) => (
            <div key={i} className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-600 truncate max-w-xs">
                  {u.file.name}
                </span>
                {u.error ? (
                  <span className="text-xs text-error-600">{u.error}</span>
                ) : (
                  <span className="text-xs text-neutral-500">{u.progress}%</span>
                )}
              </div>
              {!u.error && (
                <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {photos.length < max && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-neutral-300 hover:border-brand-400 rounded-xl py-6 flex flex-col items-center gap-2 text-neutral-500 hover:text-brand-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-brand-50 flex items-center justify-center transition-colors">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">
              {photos.length === 0 ? "Add photos" : "Add more photos"}
            </span>
            <span className="text-xs text-neutral-400">
              JPEG, PNG, WebP or HEIC — max 15 MB each
            </span>
          </button>
        </>
      )}
    </div>
  );
}
