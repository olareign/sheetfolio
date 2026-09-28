"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Formats a timestamp in the viewer's own time zone. The server renders the UTC value;
 * the client swaps in local time after hydration, so there is no hydration mismatch.
 */
export function LocalTime({ iso, format }: { iso: string; format: "time" | "date" | "datetime" }) {
  const options: Intl.DateTimeFormatOptions =
    format === "time"
      ? { hour: "2-digit", minute: "2-digit" }
      : format === "date"
        ? { day: "2-digit", month: "short", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
  const text = useSyncExternalStore(
    subscribe,
    () => new Intl.DateTimeFormat("en-GB", options).format(new Date(iso)),
    () => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(iso)),
  );
  return <time dateTime={iso}>{text}</time>;
}
