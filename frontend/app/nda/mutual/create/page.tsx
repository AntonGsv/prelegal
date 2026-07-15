import { redirect } from "next/navigation";

/** Legacy route kept as a redirect so old links land on the new document flow. */
export default function LegacyCreateNdaPage() {
  redirect("/documents/mutual-nda/create");
}
