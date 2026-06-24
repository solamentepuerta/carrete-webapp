"use client";

/* eslint-disable @next/next/no-img-element */
import imageCompression from "browser-image-compression";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  type CSSProperties,
  useEffect,
  useRef,
  useState
} from "react";
import { type Category } from "@/lib/categories";
import { firePastelConfetti, playSoftChime } from "@/lib/celebrations";
import { getDateForTimezone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/client";

type ProfileForBoard = {
  couple_id: string;
  id: string;
  timezone: string;
};

export type OwnBoardCard = {
  category: Category;
  imageSrc: string;
  isUploaded: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message
      ? message
      : "No pude completar la acción.";
  }

  return "No pude completar la acción.";
}

export function MineCarrete({
  initialOwnCards,
  profile
}: {
  initialOwnCards: OwnBoardCard[];
  profile: ProfileForBoard;
}) {
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const router = useRouter();
  const [ownCards, setOwnCards] = useState(initialOwnCards);
  const [uploadingCategory, setUploadingCategory] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setOwnCards(initialOwnCards);
  }, [initialOwnCards]);

  async function handleUpload(
    categoryId: Category["id"],
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setUploadingCategory(categoryId);

    try {
      const previewUrl = URL.createObjectURL(file);
      const compressedFile = await imageCompression(file, {
        fileType: "image/jpeg",
        initialQuality: 0.8,
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true
      });
      const entryDate = getDateForTimezone(profile.timezone || "UTC");
      const imagePath = [
        profile.couple_id,
        entryDate,
        profile.id,
        `${categoryId}-${Date.now()}.jpg`
      ].join("/");
      const supabase = createClient();
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

      setOwnCards((current) =>
        current.map((card) =>
          card.category.id === categoryId
            ? { ...card, imageSrc: previewUrl, isUploaded: true }
            : card
        )
      );
      playSoftChime();
      firePastelConfetti("soft");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setUploadingCategory(null);
      event.target.value = "";
    }
  }

  return (
    <section className="home-carrete">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        className="window-shell p-3"
        initial={{ opacity: 0, x: 18 }}
        transition={{ duration: 0.22 }}
      >
        <div className="corkboard grid grid-cols-2 gap-3 rounded-2xl p-3">
          {ownCards.map((card, index) => (
            <article
              className="polaroid aspect-[3/4] rotate-[var(--rotate)] p-2"
              key={card.category.key}
              style={
                {
                  "--rotate": `${[-3, 2, -1, 4, -4][index]}deg`
                } as CSSProperties
              }
            >
              <button
                className="polaroid-button"
                disabled={uploadingCategory === card.category.id}
                onClick={() => fileInputs.current[card.category.id]?.click()}
                type="button"
              >
                <div className="polaroid-photo relative h-full overflow-hidden rounded-xl">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="polaroid-photo-img"
                    draggable={false}
                    src={card.imageSrc}
                  />
                  <span className="washi-tape" aria-hidden="true" />
                  <span className="corner-sparkle" aria-hidden="true">
                    ✧
                  </span>
                  <p className="category-card-label px-3 text-center text-base font-bold leading-snug">
                    {uploadingCategory === card.category.id
                      ? "Subiendo..."
                      : card.category.label}
                  </p>
                </div>
              </button>
              <input
                accept="image/*"
                capture="environment"
                className="hidden-file-input"
                onChange={(event) => handleUpload(card.category.id, event)}
                ref={(node) => {
                  fileInputs.current[card.category.id] = node;
                }}
                type="file"
              />
            </article>
          ))}
        </div>
      </motion.div>

      {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
    </section>
  );
}
