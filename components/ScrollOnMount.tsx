"use client";
import { useEffect } from "react";

/** Brings the element with this id into view when it appears (e.g. a result that shows up below a form). Remount it with a `key` to scroll again. */
export default function ScrollOnMount({ id }: { id: string }) {
  useEffect(() => {
    if (window.matchMedia("(min-width: 1280px)").matches) return; // two columns: the result is already beside the form
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [id]);
  return null;
}
