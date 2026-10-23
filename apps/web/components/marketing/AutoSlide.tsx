"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const TRACK = ".mk-cards--swipe";
const PAUSE_AFTER_TOUCH_MS = 8000;

/**
 * Makes a phone swipe row (`.mk-cards--swipe`) advance by itself, with dots underneath. It only moves while the row is
 * actually a scroller (phones) and on screen, stops for a while once the person touches or focuses it, and stays still
 * for anyone who asked their device for less motion. Without JavaScript the row is simply a row you swipe.
 */
export function AutoSlide({ children, interval = 4200 }: { children: ReactNode; interval?: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = root.current?.querySelector<HTMLElement>(TRACK);
    if (!track) return;
    const items = () => Array.from(track.children) as HTMLElement[];
    const pad = () => Number.parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    const offsetOf = (el: HTMLElement) => el.getBoundingClientRect().left - track.getBoundingClientRect().left - pad();
    const scrollable = () => track.scrollWidth > track.clientWidth + 4;

    setCount(items().length);
    let pausedUntil = 0;
    let visible = false;

    const nearest = () => {
      let best = 0;
      items().forEach((el, i) => {
        if (Math.abs(offsetOf(el)) < Math.abs(offsetOf(items()[best]!))) best = i;
      });
      return best;
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(nearest()));
    };
    const hold = () => {
      pausedUntil = Date.now() + PAUSE_AFTER_TOUCH_MS;
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (reduced.matches || !visible || !scrollable() || Date.now() < pausedUntil) return;
      const list = items();
      const next = list[(nearest() + 1) % list.length];
      if (next) track.scrollBy({ left: offsetOf(next), behavior: "smooth" });
    }, interval);

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    observer.observe(track);

    track.addEventListener("scroll", onScroll, { passive: true });
    for (const type of ["pointerdown", "touchstart", "wheel", "focusin", "keydown"]) {
      track.addEventListener(type, hold, { passive: true });
    }
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      track.removeEventListener("scroll", onScroll);
      for (const type of ["pointerdown", "touchstart", "wheel", "focusin", "keydown"])
        track.removeEventListener(type, hold);
    };
  }, [interval]);

  function goTo(index: number) {
    const track = root.current?.querySelector<HTMLElement>(TRACK);
    const target = track?.children[index] as HTMLElement | undefined;
    if (!track || !target) return;
    const pad = Number.parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    track.scrollBy({
      left: target.getBoundingClientRect().left - track.getBoundingClientRect().left - pad,
      behavior: "smooth",
    });
  }

  return (
    <div ref={root} className="mk-auto">
      {children}
      {count > 1 && (
        <div className="mk-dots" role="group" aria-label="Choose a slide">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              className={i === active ? "is-on" : undefined}
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
