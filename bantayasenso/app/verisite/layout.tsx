import type { Metadata } from "next";
import { Suspense } from "react";
import { outfit } from "@/components/font";
import AuthGate from "./AuthGate";

export const metadata: Metadata = { title: "VeriSite" };

// Laki ng letra (Profile), set before the first paint so a refresh doesn't flash small text. See setLargeText in data.ts.
const textSize = `try{document.documentElement.dataset.text=localStorage.getItem("verisite:text")||""}catch(e){}`;

// Phone-width column with the VeriSite font and page background, shared by every VeriSite screen.
// `vs-app` is zoomed for large text (globals.css): every size in the app is in px, so zoom scales them all.
export default function VeriSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${outfit.className} vs-app mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-page font-medium text-ink`}>
      <script dangerouslySetInnerHTML={{ __html: textSize }} />
      {/* Suspense: the gate reads the path, which dynamic routes (project/[id]) only know at runtime. */}
      <Suspense>
        <AuthGate>{children}</AuthGate>
      </Suspense>
    </div>
  );
}
