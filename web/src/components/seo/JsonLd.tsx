import { siteJsonLdGraph } from "@/lib/seo/jsonld";

export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLdGraph()) }}
    />
  );
}