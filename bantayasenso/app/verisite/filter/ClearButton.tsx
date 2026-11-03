"use client";

import { useEffect, useRef } from "react";

// "Alisin lahat": unticks every filter and puts sort back to Pinakabago, in the sheet only.
// Nothing applies until "Ipakita ang mga proyekto", so closing the sheet keeps the old filters.
export default function ClearButton() {
  const ref = useRef<HTMLButtonElement>(null);
  // Next keeps a visited sheet mounted but hidden; effects re-run when it is shown again,
  // so reset the form to the applied filters and drop picks that were never applied.
  useEffect(() => ref.current?.form?.reset(), []);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) =>
        e.currentTarget.form?.querySelectorAll("input").forEach((i) => (i.checked = i.name === "sort" && i.value === "bago"))
      }
      className="cursor-pointer text-base font-bold whitespace-nowrap text-link"
    >
      Alisin lahat
    </button>
  );
}
