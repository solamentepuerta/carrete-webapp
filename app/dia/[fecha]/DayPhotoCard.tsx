"use client";

import { useState, type CSSProperties } from "react";

export type DayPhotoCardProps = {
  /** URL of the image to display (signed URL or /api/photos path). */
  imageSrc: string;
  /** Category label text, e.g. "Me sacó una sonrisa". */
  categoryLabel: string;
  /** Category emoji, e.g. "😊". */
  categoryEmoji: string;
  /** Optional photo caption written by the author. */
  caption?: string | null;
  /** Optional footer text, e.g. "Tu pista: Me acordé de ti". */
  footer?: string;
  /** Result tone for styling the footer badge. */
  resultTone?: "correct" | "miss";
  /** True when no photo has been uploaded for this slot. */
  isEmpty?: boolean;
  /** CSS rotation in degrees for the polaroid tilt. */
  rotation: number;
};

/**
 * A read-only polaroid card with shimmer loading effect.
 *
 * While the image loads, a pulsing shimmer placeholder is shown.
 * The image fades in smoothly once loaded.
 */
export function DayPhotoCard({
  imageSrc,
  categoryLabel,
  categoryEmoji,
  caption,
  footer,
  resultTone,
  isEmpty,
  rotation
}: DayPhotoCardProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <article
      className={`read-polaroid ${isEmpty ? "read-polaroid-empty" : ""}`}
      style={{ "--rotate": `${rotation}deg` } as CSSProperties}
    >
      <div className="read-photo relative">
        {/* Shimmer placeholder — visible until the image loads */}
        {!loaded && <div className="image-shimmer-placeholder" />}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={categoryLabel}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          src={imageSrc}
        />

        <span className="washi-tape" aria-hidden="true" />
      </div>

      <div className="read-caption">
        <p className="font-bold">
          {categoryEmoji} {categoryLabel}
        </p>
        {caption ? <p className="mt-1 text-sm">{caption}</p> : null}
        {footer ? (
          <p className={`read-result read-result-${resultTone}`}>
            {resultTone === "correct" ? "Bien" : "Casi"} · {footer}
          </p>
        ) : null}
      </div>
    </article>
  );
}
