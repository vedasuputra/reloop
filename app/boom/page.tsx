"use client";
import { notFound } from "next/navigation";

/**
 * Development only: open /boom to look at the "Something went wrong" page (it throws on purpose, in the browser).
 * In development Next first shows its own error panel on top; close it (Esc or the X) to see the page underneath.
 * In production this address is simply a 404.
 */
export default function Boom() {
  if (process.env.NODE_ENV === "production") notFound();
  if (typeof window !== "undefined") throw new Error("Test error from /boom");
  return null;
}
