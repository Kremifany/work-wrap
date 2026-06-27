"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase-client";
import { upsertBusinessProfileAction } from "@/actions/businesses";
import { Alert, Spinner } from "@/components/ui";
import { Camera, Save } from "lucide-react";
import { initials } from "@/lib/utils";
import type { SessionContext } from "@/types";

const ALLOWED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface ProfilePageClientProps {
  session: SessionContext;
}

export default function ProfilePageClient({ session }: ProfilePageClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const biz = session.business;

  const [name, setName] = useState(biz?.name ?? "");
  const [ownerName, setOwnerName] = useState(biz?.ownerName ?? "");
  const [email, setEmail] = useState(biz?.email ?? session.user.email);
  const [phone, setPhone] = useState(biz?.phone ?? "");
  const [address, setAddress] = useState(biz?.address ?? "");
  const [logoUrl, setLogoUrl] = useState(biz?.logoUrl ?? "");
  const [brandColor, setBrandColor] = useState(biz?.brandColor ?? "#1E5AA8");
  const [googleReviewUrl, setGoogleReviewUrl] = useState(biz?.googleReviewUrl ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleLogoUpload = async (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setError("Logo must be JPEG, PNG, WebP, or SVG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5 MB.");
      return;
    }
    setLogoUploading(true);
    setLogoProgress(0);
    try {
      const path = `businesses/${session.user.uid}/logo_${Date.now()}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);
      task.on("state_changed", (snap) => {
        setLogoProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      });
      await task;
      const url = await getDownloadURL(task.snapshot.ref);
      setLogoUrl(url);
    } catch {
      setError("Logo upload failed. Please try again.");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await upsertBusinessProfileAction({
        name: name.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        logoUrl,
        brandColor,
        googleReviewUrl,
      });
      if (!result.success) {
        setError(result.error ?? "Save failed.");
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          Profile saved successfully.
        </Alert>
      )}

      {/* Logo */}
      <div className="card card-padded">
        <h2 className="font-semibold text-neutral-900 mb-4">Company Logo</h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-xl border-2 border-neutral-200 overflow-hidden flex items-center justify-center bg-neutral-100 shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-neutral-400">
                {initials(name || "?")}
              </span>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              className="btn btn-outline flex items-center gap-2"
            >
              {logoUploading ? (
                <>
                  <Spinner size="sm" />
                  {logoProgress}%
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Upload Logo
                </>
              )}
            </button>
            <p className="text-xs text-neutral-400 mt-1">
              JPEG, PNG, WebP or SVG — max 5 MB
            </p>
          </div>
        </div>
      </div>

      {/* Business info */}
      <div className="card card-padded space-y-4">
        <h2 className="font-semibold text-neutral-900">Business Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="biz-name">
              Business name <span className="text-error-500">*</span>
            </label>
            <input
              id="biz-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fp-input"
              required
              maxLength={100}
              placeholder="Tampa Pro Garage Doors"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="owner-name">
              Owner / Your name <span className="text-error-500">*</span>
            </label>
            <input
              id="owner-name"
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="fp-input"
              required
              maxLength={100}
              placeholder="John Smith"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="biz-phone">
              Phone
            </label>
            <input
              id="biz-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="fp-input"
              maxLength={30}
              placeholder="(813) 555-0100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="biz-email">
              Contact email <span className="text-error-500">*</span>
            </label>
            <input
              id="biz-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="fp-input"
              required
              maxLength={200}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="biz-address">
              Business address
            </label>
            <input
              id="biz-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="fp-input"
              maxLength={300}
              placeholder="456 Commerce Blvd, Tampa, FL 33602"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="brand-color">
              Report accent color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 rounded border border-neutral-200 cursor-pointer"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="fp-input flex-1 font-mono text-sm"
                pattern="^#[0-9A-Fa-f]{6}$"
                maxLength={7}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="google-review">
              Google review link
              <span className="text-neutral-400 font-normal ml-1">optional</span>
            </label>
            <input
              id="google-review"
              type="url"
              value={googleReviewUrl}
              onChange={(e) => setGoogleReviewUrl(e.target.value)}
              className="fp-input"
              placeholder="https://g.page/r/..."
              maxLength={500}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || logoUploading}
          className="btn btn-primary flex items-center gap-2"
        >
          {pending ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
          {pending ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
