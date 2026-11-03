"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import PageHeader from "@/components/PageHeader";
import TextField from "@/components/TextField";
import { startSignup } from "../data";
import type { SignupErrors, SignupInput } from "../store";

// Make an account (W-Signup). A valid form sends a code and opens Verify; the account is made there.
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<SignupInput>({ username: "", mobile: "", password: "", terms: false });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof SignupInput, v: string | boolean) => {
    setForm({ ...form, [k]: v });
    setErrors({ ...errors, [k]: undefined }); // the error goes away once the field is changed
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const found = await startSignup(form);
      if (!Object.keys(found).length) return router.push("/verisite/verify");
      setErrors(found);
    } catch {
      setErrors({ password: "Hindi magawa ang account dito. Buksan ang app sa https na link." });
    }
    setBusy(false);
  }

  return (
    <PageHeader image="head-happy" back="/verisite/welcome" title={<>Gumawa ng<br />account</>}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label="Username"
          icon="person"
          autoComplete="username"
          autoCapitalize="none"
          maxLength={20}
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
          placeholder="Pumili ng username"
          error={errors.username}
        />
        <TextField
          label="Mobile number"
          icon="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          value={form.mobile}
          onChange={(e) => set("mobile", e.target.value)}
          placeholder="09XX XXX XXXX"
          error={errors.mobile}
        />
        <TextField
          label="Password"
          icon="lock"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="Gumawa ng password"
          error={errors.password}
        />
        <div>
          <label className="flex cursor-pointer items-center gap-3 text-17 leading-[1.3] font-semibold">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => set("terms", e.target.checked)}
              aria-invalid={!!errors.terms}
              className="size-7 flex-none cursor-pointer accent-[#2E9E6B]"
            />
            {/* shortcut: no Terms or Privacy Policy page yet; link them here once written. */}
            Pumapayag ako sa Terms at Privacy Policy.
          </label>
          {errors.terms && <p className="mt-1.5 text-15 font-semibold text-lampas">{errors.terms}</p>}
        </div>
        <ButtonLink disabled={busy}>Gumawa ng account</ButtonLink>
      </form>
      <p className="mt-2 text-center text-lg font-semibold">
        May account na?{" "}
        <Link href="/verisite/login" className="font-bold text-link no-underline">
          Mag-login
        </Link>
      </p>
    </PageHeader>
  );
}
