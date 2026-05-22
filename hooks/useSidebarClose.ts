"use client";

export function useSidebarClose(delay = 0) {
  return () => {
    if (delay > 0) {
      window.setTimeout(() => undefined, delay);
    }
  };
}
