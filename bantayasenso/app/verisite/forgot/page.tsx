"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import PageHeader from "@/components/PageHeader";
import TextField from "@/components/TextField";
import { startReset } from "../data";

// "Nakalimutan ang password?": the account's mobile number and a new password, confirmed on Verify.
export default function ForgotPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ mobile?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const found = await startReset(mobile, password);
      if (!found.mobile && !found.password) return router.push("/verisite/verify");
      setErrors(found);
    } catch {
      setErrors({ password: "Hindi mapalitan dito. Buksan ang app sa https na link." });
    }
    setBusy(false);
  }

  return (
    <PageHeader image="head-worry" back="/verisite/login" title="Palitan ang password" subtitle="Magpapadala kami ng code sa numero mo.">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label="Mobile number ng account"
          icon="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          value={mobile}
          onChange={(e) => {
            setMobile(e.target.value);
            setErrors({ ...errors, mobile: undefined });
          }}
          placeholder="09XX XXX XXXX"
          error={errors.mobile}
        />
        <TextField
          label="Bagong password"
          icon="lock"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors({ ...errors, password: undefined });
          }}
          placeholder="8 o higit pang letra o numero"
          error={errors.password}
        />
        <ButtonLink disabled={busy}>Magpadala ng code</ButtonLink>
      </form>
    </PageHeader>
  );
}
