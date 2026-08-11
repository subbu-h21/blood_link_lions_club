"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Thin wrapper around next/image that fades an image in once it's
 * actually loaded, instead of the default sudden pop-in the moment the
 * browser finishes decoding it - most noticeable on the homepage's large
 * remote Cloudinary hero image, but applied everywhere for consistency
 * (project owner's own explicit request, 2026-08-11/12).
 *
 * A small "use client" leaf, not a reason to convert its callers
 * (app/layout.tsx, app/(public)/page.tsx) into Client Components
 * themselves - both stay Server Components and just render this in
 * place of a bare <Image>, same pattern as LanguageToggle.tsx being the
 * one client island inside the server-rendered root layout.
 *
 * `onLoad` fires for a cache hit too (confirmed by Next's own docs -
 * unlike the native <img> element, next/image's onLoad always fires
 * once the image is actually visible, including from cache), so a
 * repeat visit doesn't see a pointless flash-to-transparent-then-back.
 */
export function FadeImage({ className, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  // `alt` is spread in via `...props` below, not a literal attribute the
  // static rule can see - ImageProps itself requires `alt: string`, so
  // every caller is already forced to supply one at compile time.
  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...props}
      className={`${className ?? ""} transition-opacity duration-700 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}
