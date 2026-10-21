"use client";

import Image from "next/image";
import { useState } from "react";
import { CoverImage } from "@/components/sp/CoverImage";
import { MediaFrame } from "@/components/sp/MediaFrame";
import type { Cover } from "@/content/covers";
import type { ProjectImage } from "@/content/schemas";

/** Main picture plus thumbnails (PRD §3.2). With no photos of its own, a project shows its cover and says where it came from. */
export function Gallery({
  images,
  cover,
  title,
  websiteHost,
}: {
  images: ProjectImage[];
  cover: Cover;
  title: string;
  websiteHost?: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  if (!current) {
    return (
      <figure className="pp-gallery">
        <MediaFrame wide>
          <CoverImage cover={cover} sizes="(max-width: 900px) 100vw, 760px" priority />
        </MediaFrame>
        <figcaption className="sp-annot">
          {cover.kind === "preview" && `Preview of ${websiteHost ?? "the project website"}.`}
          {cover.kind === "stock" && "Stock photo. Project photos to follow."}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="pp-gallery">
      <MediaFrame wide>
        <Image
          src={current.url}
          alt={current.caption || `${title}, photo ${index + 1}`}
          fill
          priority={index === 0}
          sizes="(max-width: 900px) 100vw, 760px"
        />
      </MediaFrame>
      {images.length > 1 && (
        <div className="pp-thumbs" role="group" aria-label="Choose a photo">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className="pp-thumb"
              aria-current={i === index}
              aria-label={`Show photo ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
              onClick={() => setIndex(i)}
            >
              <Image src={img.url} alt="" fill sizes="180px" />
            </button>
          ))}
        </div>
      )}
      {current.caption && <figcaption className="sp-annot">{current.caption}</figcaption>}
    </figure>
  );
}
