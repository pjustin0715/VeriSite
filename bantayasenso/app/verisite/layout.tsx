import type { Metadata } from "next";
import { outfit } from "@/components/font";

export const metadata: Metadata = { title: "VeriSite" };

// Phone-width column with the VeriSite font and page background, shared by every VeriSite screen.
export default function VeriSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${outfit.className} mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-page font-medium text-ink`}>
      {children}
    </div>
  );
}
