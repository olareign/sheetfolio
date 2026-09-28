"use client";

import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type { ProjectImage } from "@/content/schemas";
import { UPLOAD_RULES } from "@/content/uploads";
import { Button } from "@/components/sp/Button";
import { uploadFile } from "./upload-client";

export const MAX_PHOTOS = 12;

type Img = { url: string; caption?: string; isCover?: boolean };

/** First photo is the cover; order here is display order (FIG. 1, FIG. 2…). */
function withCover(images: Img[]): ProjectImage[] {
  return images.map((img, i) => ({ url: img.url, caption: img.caption, isCover: i === 0 }));
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function ImageList({
  id,
  value,
  onChange,
  slug,
  title,
}: {
  id: string;
  value: Img[];
  onChange: (images: ProjectImage[]) => void;
  slug: string;
  title: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const images = value ?? [];
  const room = MAX_PHOTOS - images.length;

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    const accepted = list.slice(0, room);
    const problems =
      list.length > room ? [`Only ${MAX_PHOTOS} photos per project; ${list.length - room} skipped.`] : [];
    let current = images;
    for (const [i, file] of accepted.entries()) {
      setProgress(`Uploading ${i + 1} of ${accepted.length}…`);
      try {
        const url = await uploadFile(file, { slug, folder: "projects", kind: "image" });
        current = [...current, { url }];
        onChange(withCover(current));
      } catch (err) {
        problems.push(err instanceof Error ? err.message : `Couldn't upload ${file.name}.`);
      }
    }
    setProgress(null);
    setErrors(problems);
    if (input.current) input.current.value = "";
  }

  const update = (next: Img[]) => onChange(withCover(next));

  return (
    <div className="cms-stack">
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={UPLOAD_RULES.image.contentTypes.join(",")}
        className="sp-visually-hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
      <button
        type="button"
        className={`cms-dropzone${over ? " is-over" : ""}`}
        disabled={room <= 0 || progress !== null}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
      >
        <Upload size={20} strokeWidth={1.5} aria-hidden="true" />
        <b>{progress ?? (room > 0 ? "Drop site photos here" : "Photo limit reached")}</b>
        <span className="sp-field-hint">
          {UPLOAD_RULES.image.hint} · first photo is the cover · {images.length}/{MAX_PHOTOS}
        </span>
      </button>
      {errors.map((e) => (
        <p key={e} className="sp-field-error" role="alert">
          {e}
        </p>
      ))}
      {images.length > 0 && (
        <ol className="cms-thumbs" aria-label="Photos in display order">
          {images.map((img, i) => (
            <li key={img.url} className="cms-thumb">
              <div className="cms-thumb-img">
                <Image src={img.url} alt={img.caption || `${title}, photo ${i + 1}`} fill sizes="200px" />
                <span className="cms-thumb-tag sp-tag">{i === 0 ? "Cover" : `Fig. ${i + 1}`}</span>
              </div>
              <label className="sp-visually-hidden" htmlFor={`${id}-caption-${i}`}>
                Caption for photo {i + 1}
              </label>
              <input
                id={`${id}-caption-${i}`}
                className="sp-input"
                placeholder="Caption"
                maxLength={200}
                value={img.caption ?? ""}
                onChange={(e) =>
                  update(images.map((m, j) => (j === i ? { ...m, caption: e.target.value || undefined } : m)))
                }
              />
              <div className="cms-thumb-tools">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move photo ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => update(move(images, i, i - 1))}
                  icon={<ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move photo ${i + 1} later`}
                  disabled={i === images.length - 1}
                  onClick={() => update(move(images, i, i + 1))}
                  icon={<ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />}
                />
                {i > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => update(move(images, i, 0))}>
                    Make cover
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="cms-danger"
                  onClick={() => update(images.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
