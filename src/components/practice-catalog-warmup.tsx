"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { startPracticeCatalog } from "@/lib/practice-catalog";

export function PracticeCatalogWarmup() {
  const router = useRouter();
  startPracticeCatalog();

  useEffect(() => {
    router.prefetch("/typing");
    router.prefetch("/steno");
  }, [router]);

  return null;
}
