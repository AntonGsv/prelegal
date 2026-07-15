import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { listDocuments } from "../src/lib/document-registry";

/** Gallery of every supported document type, linking to each one's chat flow. */
export function DocumentGallery() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="document-gallery"
    >
      {listDocuments().map((doc) => (
        <Link
          key={doc.slug}
          href={`/documents/${doc.slug}/create`}
          data-testid={`doc-card-${doc.slug}`}
          className="group"
        >
          <Card className="h-full transition group-hover:border-[#209dd7] group-hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-base text-[#032147]">
                {doc.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{doc.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
