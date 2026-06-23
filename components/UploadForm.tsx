"use client";

import imageCompression from "browser-image-compression";
import { motion } from "framer-motion";
import { ChangeEvent, type CSSProperties, useMemo, useState } from "react";
import { categories } from "@/lib/categories";
import { createClient } from "@/lib/supabase/client";

type ProfileForUpload = {
  id: string;
  couple_id: string;
  timezone: string;
};

type UploadState = {
  error?: string;
  fileName?: string;
  previewUrl?: string;
  status: "empty" | "uploading" | "done" | "error";
};

function getDateForTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getInitialState() {
  return Object.fromEntries(
    categories.map((category) => [category.id, { status: "empty" }])
  ) as Record<(typeof categories)[number]["id"], UploadState>;
}

export function UploadForm({ profile }: { profile: ProfileForUpload }) {
  const [uploads, setUploads] = useState(getInitialState);
  const completedCount = useMemo(
    () =>
      Object.values(uploads).filter((upload) => upload.status === "done").length,
    [uploads]
  );

  async function handleFileChange(
    categoryId: (typeof categories)[number]["id"],
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploads((current) => ({
      ...current,
      [categoryId]: {
        fileName: file.name,
        previewUrl,
        status: "uploading"
      }
    }));

    try {
      const compressedFile = await imageCompression(file, {
        fileType: "image/jpeg",
        initialQuality: 0.8,
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true
      });
      const supabase = createClient();
      const entryDate = getDateForTimezone(profile.timezone || "UTC");
      const imagePath = [
        profile.couple_id,
        entryDate,
        profile.id,
        `${categoryId}-${Date.now()}.jpg`
      ].join("/");

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(imagePath, compressedFile, {
          cacheControl: "31536000",
          contentType: "image/jpeg",
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: entryError } = await supabase.rpc("create_entry", {
        p_caption: null,
        p_category_id: categoryId,
        p_image_path: imagePath
      });

      if (entryError) {
        throw entryError;
      }

      setUploads((current) => ({
        ...current,
        [categoryId]: {
          fileName: compressedFile.name,
          previewUrl,
          status: "done"
        }
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la foto.";

      setUploads((current) => ({
        ...current,
        [categoryId]: {
          error: message,
          fileName: file.name,
          previewUrl,
          status: "error"
        }
      }));
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="upload-stack">
      <div className="pixel-card upload-progress px-4 py-3">
        <span>Fotos de hoy</span>
        <strong>{completedCount}/5</strong>
      </div>

      <div className="upload-grid">
        {categories.map((category, index) => {
          const upload = uploads[category.id];
          const isBusy = upload.status === "uploading";
          const rotation = [-2, 2, -1, 1, -2][index];

          return (
            <article
              className="upload-card"
              key={category.key}
              style={{ "--rotate": `${rotation}deg` } as CSSProperties}
            >
              <motion.div
                animate={{
                  opacity: 1,
                  rotate: rotation,
                  y: 0
                }}
                className="upload-polaroid"
                initial={{ opacity: 0, rotate: rotation - 4, y: -18 }}
                transition={{ damping: 12, stiffness: 120, type: "spring" }}
              >
                <div
                  className={`upload-preview ${
                    upload.previewUrl ? "upload-preview-filled" : ""
                  }`}
                  style={
                    upload.previewUrl
                      ? { backgroundImage: `url(${upload.previewUrl})` }
                      : undefined
                  }
                >
                  {upload.previewUrl ? (
                    <motion.span
                      animate={{ filter: "brightness(1) saturate(1)" }}
                      className="upload-reveal"
                      initial={{ filter: "brightness(0.25) saturate(0)" }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                    />
                  ) : (
                    <span className="upload-empty">{category.emoji}</span>
                  )}
                </div>

                <p className="upload-label">{category.label}</p>
              </motion.div>

              <label className="soft-button upload-action">
                <input
                  accept="image/*"
                  capture="environment"
                  disabled={isBusy}
                  onChange={(event) => handleFileChange(category.id, event)}
                  type="file"
                />
                {isBusy
                  ? "Revelando..."
                  : upload.status === "done"
                    ? "Cambiar"
                    : "Elegir foto"}
              </label>

              {upload.status === "done" ? (
                <p className="upload-note">Lista</p>
              ) : null}
              {upload.status === "error" ? (
                <p className="auth-error">{upload.error}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
