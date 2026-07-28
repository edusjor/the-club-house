"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

function subscribeNoop() {
  return () => {};
}

export default function BodyPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
}
