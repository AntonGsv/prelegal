"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route kept as a redirect so old links land on the new document flow.
 * Uses a client-side redirect (not the server `redirect()`) so the page is
 * compatible with the static export (`output: "export"`), which has no request-
 * time server to run a server redirect.
 */
export default function LegacyCreateNdaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/documents/mutual-nda/create");
  }, [router]);

  return null;
}
