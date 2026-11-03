"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";

// Sort button with a small dropdown. Picking an option navigates (cards update) and closes the menu.
export default function SortMenu({ label, options }: { label: string; options: { label: string; href: string; on: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-11 cursor-pointer items-center gap-1 rounded-[22px] bg-white px-[15px] text-base font-semibold whitespace-nowrap text-ink shadow-card"
      >
        {label}
        <Icon name="chevron" size={17} strokeWidth={2.4} />
      </button>
      {open && (
        <>
          {/* Tapping outside closes the menu. */}
          <button type="button" aria-label="Isara" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-20 cursor-default" />
          <div role="menu" className="absolute top-[52px] right-0 z-30 flex w-[250px] flex-col rounded-card bg-white p-1.5 shadow-card">
            {options.map((o) => (
              <Link
                key={o.label}
                href={o.href}
                role="menuitemradio"
                aria-checked={o.on}
                scroll={false}
                onClick={() => setOpen(false)}
                className={`flex h-12 items-center justify-between rounded-[14px] px-3.5 text-base no-underline ${o.on ? "bg-soft font-bold text-link" : "font-semibold text-ink"}`}
              >
                {o.label}
                {o.on && <Icon name="check" size={18} color="#2E9E6B" strokeWidth={2.6} />}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
