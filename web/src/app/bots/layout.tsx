import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bot Factory · Tradr",
  description: "Build and backtest formula trading bots for Tradr races.",
  robots: { index: false, follow: false },
};

export default function BotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
