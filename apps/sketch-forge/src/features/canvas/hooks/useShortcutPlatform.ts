"use client";

import { useEffect, useState } from "react";

function detectIsMac() {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

export function useShortcutPlatform() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(detectIsMac());
  }, []);

  return { isMac };
}
