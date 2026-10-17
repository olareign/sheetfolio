"use client";

import Image from "next/image";
import { useState } from "react";
import { CropFrame } from "@/components/sp/CropFrame";
import { Placeholder } from "@/components/sp/Placeholder";
import type { Category, ProjectImage } from "@/content/schemas";

/** FIG. 1 main image in crop marks + FIG. 2… thumbnails (PRD §3.2). */
export function Gallery({ images, category, title }: { images: ProjectImage[]; category: Category; title: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  if (!current) {
    return (
      <figure className="pp-gallery">
        <CropFrame wide pending no="FIG. 1">
          <Placeholder category={category} />
        </CropFrame>
        <figcaption className="sp-annot">Site photos to follow.</figcaption>
      </figure>
    );
  }

  return (
    <figure className="pp-gallery">
      <CropFrame wide no={`FIG. ${index + 1}`}>
        <Image
          src={current.url}
          alt={current.caption || `${title}, photo ${index + 1}`}
          fill
          priority={index === 0}
          sizes="(max-width: 900px) 100vw, 760px"
        />
      </CropFrame>
      {images.length > 1 && (
        <div className="pp-thumbs" role="group" aria-label="Choose a photo">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className="pp-thumb"
              aria-current={i === index}
              aria-label={`Show figure ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
              onClick={() => setIndex(i)}
            >
              <Image src={img.url} alt="" fill sizes="180px" />
              <span>FIG. {i + 1}</span>
            </button>
          ))}
        </div>
      )}
      <figcaption className="sp-annot">
        FIG. {index + 1}
        {current.caption ? ` — ${current.caption}` : ""}
      </figcaption>
    </figure>
  );
}
