import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tradr Academy",
  description: "Quant trading and AI-agent curriculum for Tradr — lessons, labs, and story races.",
  robots: { index: false, follow: false },
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
