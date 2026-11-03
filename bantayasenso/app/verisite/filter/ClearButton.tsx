"use client";

import { useEffect, useRef } from "react";

// "Alisin lahat": unticks every filter in the popup (sort is not here, so it stays).
// Nothing applies until "Ipakita ang mga proyekto", so closing the popup keeps the old filters.
// Shown only while something is ticked (`group-has-checked` on the form).
export default function ClearButton() {
  const ref = useRef<HTMLButtonElement>(null);
  // Next keeps a visited popup mounted but hidden; effects re-run when it is shown again,
  // so reset the form to the applied filters and drop picks that were never applied.
  useEffect(() => ref.current?.form?.reset(), []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => e.currentTarget.form?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((i) => (i.checked = false))}
      className="hidden cursor-pointer text-base font-bold whitespace-nowrap text-link group-has-checked:block"
    >
      Alisin lahat
    </button>
  );
}
