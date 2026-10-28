"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/*
 * On a phone the dashboard's sidebar is a drawer: the menu button in the top bar opens it, and it closes on a new page,
 * on Escape, on a tap outside, or when the window grows back to desktop width. While it is open the page behind it is
 * inert, so keyboard and screen-reader users stay inside the menu.
 */

type Drawer = {
  open: boolean;
  /** Opens the drawer. */
  show: () => void;
  /** Closes it and puts focus back on the menu button. */
  hide: () => void;
};

/** The menu button in the top bar, found by id so the provider holds no ref to it. */
export const MENU_BUTTON_ID = "cms-menu-btn";

const DrawerContext = createContext<Drawer | null>(null);

export function useNavDrawer(): Drawer {
  const drawer = useContext(DrawerContext);
  if (!drawer) throw new Error("useNavDrawer needs a NavDrawerProvider");
  return drawer;
}

export function NavDrawerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(pathname);
  // Set when the person closes the menu themselves, so focus goes back to its button once the page is no longer inert.
  const returnFocus = useRef(false);

  // Going to another page closes the menu (adjusted while rendering, so there is no frame with it open on the new page).
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => {
    returnFocus.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const main = document.querySelector(".cms-main");
    main?.setAttribute("inert", "");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };
    const wide = window.matchMedia("(min-width: 901px)");
    const onResize = () => wide.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onResize);
    return () => {
      main?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
      if (returnFocus.current) {
        returnFocus.current = false;
        document.getElementById(MENU_BUTTON_ID)?.focus();
      }
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onResize);
    };
  }, [open, hide]);

  const value = useMemo(() => ({ open, show, hide }), [open, show, hide]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}
