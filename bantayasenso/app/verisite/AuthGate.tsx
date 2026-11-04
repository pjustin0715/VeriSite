"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { today, useData, useSampleMode } from "./data";
import { userOf } from "./store";

// Screens for logged-out people. "/verisite" is the developer preview of the parts.
const entry = ["/verisite/welcome", "/verisite/login", "/verisite/signup", "/verisite/verify", "/verisite/forgot"];

// No guest mode: logged-out people go to Welcome; logged-in people skip the entry screens.
// shortcut: checked in the browser only (accounts live in localStorage); move to middleware with real auth.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const data = useData();
  const sampleMode = useSampleMode();
  const loggedIn = data ? !!userOf(data, today()) : null; // null until the browser loads the data
  const isEntry = entry.includes(path);
  const open = path === "/verisite" || (isEntry ? loggedIn !== true : loggedIn === true);

  useEffect(() => {
    if (loggedIn === null || path === "/verisite") return;
    if (isEntry && loggedIn) router.replace("/verisite/home");
    if (!isEntry && !loggedIn) router.replace("/verisite/welcome");
  }, [loggedIn, isEntry, path, router]);

  // Always render the page, only hidden: returning null "drops" the page segment, which breaks Next's instant-navigation check.
  return (
    <div className={open ? "contents" : "hidden"}>
      {sampleMode && (
        <p role="status" className="pointer-events-none fixed top-[max(6px,env(safe-area-inset-top))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink/80 px-2.5 py-0.5 text-14 font-semibold whitespace-nowrap text-white">
          Halimbawang datos lang
        </p>
      )}
      {children}
    </div>
  );
}
