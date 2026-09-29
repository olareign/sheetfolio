"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** en-GB spells September "Sept"; the design uses three-letter months everywhere ("28 Sep 2026"). */
function format3(fmt: Intl.DateTimeFormat, date: Date): string {
  return fmt
    .formatToParts(date)
    .map((p) => (p.type === "month" ? p.value.slice(0, 3) : p.value))
    .join("");
}

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
    () => format3(new Intl.DateTimeFormat("en-GB", options), new Date(iso)),
    () => format3(new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }), new Date(iso)),
  );
  return <time dateTime={iso}>{text}</time>;
}
