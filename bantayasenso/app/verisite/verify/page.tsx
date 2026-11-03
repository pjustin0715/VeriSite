"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import PageHeader from "@/components/PageHeader";
import { resendCode, usePending, verifyCode } from "../data";

const spaced = (m: string) => `${m.slice(0, 4)} ${m.slice(4, 7)} ${m.slice(7)}`;

// Enter the 6-digit code (W-Verify) that finishes a signup or a password reset.
export default function VerifyPage() {
  const router = useRouter();
  const pending = usePending();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  if (pending === undefined) return null;
  const back = pending?.kind === "reset" ? "/verisite/forgot" : "/verisite/signup";
  if (!pending)
    return (
      <PageHeader image="head-worry" back="/verisite/welcome" title="Walang code na hinihintay">
        <p className="text-lg">Nag-expire na o natapos na ito. Magsimula ulit.</p>
        <ButtonLink href="/verisite/signup">Gumawa ng account</ButtonLink>
        <ButtonLink href="/verisite/login" variant="white">
          Mag-login
        </ButtonLink>
      </PageHeader>
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = verifyCode(code);
    if (err) return setError(err);
    router.replace("/verisite/home");
  }

  return (
    <PageHeader image="head-scan" back={back} title="Ilagay ang code">
      <p className="text-lg font-semibold text-muted">Nagpadala kami ng code sa {spaced(pending.mobile)}.</p>

      {/* shortcut: no SMS is sent yet, so the code is shown here; remove this box once real SMS (Supabase phone OTP) is in. */}
      <p className="rounded-[16px] border-2 border-dashed border-primary bg-soft px-4 py-2.5 text-base">
        Demo lang, walang totoong SMS. Ang code: <strong className="tracking-[2px]">{pending.code}</strong>
      </p>

      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <label className="relative block">
          <span className="sr-only">6 na numero ng code</span>
          <span aria-hidden="true" className="grid grid-cols-6 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className={`flex h-[60px] items-center justify-center rounded-[18px] border-2 bg-white text-[28px] font-bold ${
                  error ? "border-lampas" : code[i] || i === code.length ? "border-primary" : "border-line"
                }`}
              >
                {code[i]}
              </span>
            ))}
          </span>
          {/* One real input over the six boxes, so typing, pasting and SMS autofill all work. */}
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            aria-invalid={!!error}
            className="absolute inset-0 text-transparent caret-transparent opacity-0"
          />
        </label>
        {error && (
          <p role="alert" className="text-center text-base font-semibold text-lampas">
            {error}
          </p>
        )}
        <ButtonLink>I-verify</ButtonLink>
      </form>

      <p className="mt-2 text-center text-lg font-semibold">
        Hindi natanggap?{" "}
        <button
          type="button"
          onClick={() => {
            resendCode();
            setCode("");
            setError("");
            setResent(true);
          }}
          className="cursor-pointer font-bold text-link"
        >
          Ipadala ulit
        </button>
      </p>
      <p role="status" className="text-center text-base text-muted">
        {resent && "Nagpadala kami ng bagong code. Hindi na gagana ang luma."}
      </p>
    </PageHeader>
  );
}
