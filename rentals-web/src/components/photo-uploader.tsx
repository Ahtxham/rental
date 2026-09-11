"use client";

import { Camera, Loader2, X } from "lucide-react";

import { photoSrc } from "@/lib/photos";
import { useRef, useState } from "react";

/**
 * Photos of the car.
 *
 * Uploaded one at a time as they are picked rather than held until submit: on
 * a phone connection, four photos going up at the moment somebody taps "send"
 * is a long silence with a spinner and no way to tell whether it is working.
 * This way the form only ever submits URLs, and a failed photo is obvious
 * immediately and costs nothing else.
 */
export const PhotoUploader = ({
  photos,
  onChange,
  max = 8,
  endpoint = "/api/lender/upload",
  hint = "Outside, inside, and the dashboard. Photos are what a customer picks a car on, the same car with three good pictures rents about twice as often.",
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
  /** Which session uploads this. The office and a car owner have different ones. */
  endpoint?: string;
  hint?: string;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);

    const room = max - photos.length;
    const chosen = Array.from(files).slice(0, room);
    setBusy((count) => count + chosen.length);

    const uploaded: string[] = [];
    for (const file of chosen) {
      const form = new FormData();
      form.append("file", file);
      try {
        const response = await fetch(endpoint, { method: "POST", body: form });
        const body = (await response.json()) as { data?: { url?: string }; message?: string };
        if (response.ok && body.data?.url) uploaded.push(body.data.url);
        else setError(body.message ?? "One photo did not upload.");
      } catch {
        setError("One photo did not upload.");
      }
      setBusy((count) => count - 1);
    }

    if (uploaded.length) onChange([...photos, ...uploaded]);
    if (input.current) input.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, index) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoSrc(url)}
              alt={`Photo ${index + 1}`}
              className="size-24 rounded-xl border border-line object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute -end-1.5 -top-1.5 rounded-full bg-alert p-1 text-white"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ))}

        {busy > 0
          ? Array.from({ length: busy }).map((_, index) => (
              <div
                key={`busy-${index}`}
                className="flex size-24 items-center justify-center rounded-xl border border-dashed border-line"
              >
                <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
              </div>
            ))
          : null}

        {photos.length + busy < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-muted transition-colors hover:border-line hover:text-ink"
          >
            <Camera className="size-5" aria-hidden />
            <span className="text-[10px] font-semibold">Add</span>
          </button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void pick(event.target.files)}
      />

      {error ? (
        <p className="mt-2 text-xs text-alert" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
};
