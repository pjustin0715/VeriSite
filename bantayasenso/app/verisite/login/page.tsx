"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ButtonLink from "@/components/ButtonLink";
import PageHeader from "@/components/PageHeader";
import TextField from "@/components/TextField";
import { logIn } from "../data";

const DEMO = { id: "maria_s", password: "verisite123" };

// Log in with a username or mobile number (W-Login), plus a marked demo account for judges.
export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(name: string, pass: string) {
    if (!name.trim() || !pass) return setError("Ilagay ang username o mobile number at ang password.");
    setError("");
    setBusy(true);
    try {
      if (await logIn(name, pass)) return router.replace("/verisite/home");
      setError("Mali ang username, mobile number o password.");
    } catch {
      setError("Hindi makapag-login dito. Buksan ang app sa https na link.");
    }
    setBusy(false);
  }

  return (
    <PageHeader image="head-walk" back="/verisite/welcome" title="Kumusta ulit!" subtitle="Tuloy ang streak mo.">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          go(id, password);
        }}
        className="flex flex-col gap-4"
      >
        <TextField label="Username o mobile number" icon="person" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} placeholder="maria_s" />
        <TextField
          label="Password"
          icon="lock"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ilagay ang password"
        />
        <Link href="/verisite/forgot" className="-mt-1 self-end py-1 text-lg font-bold text-link no-underline">
          Nakalimutan ang password?
        </Link>
        {error && (
          <p role="alert" className="text-center text-base font-semibold text-lampas">
            {error}
          </p>
        )}
        <ButtonLink disabled={busy}>Mag-login</ButtonLink>
      </form>

      <p className="mt-2 text-center text-lg font-semibold">
        Wala pang account?{" "}
        <Link href="/verisite/signup" className="font-bold text-link no-underline">
          Mag-sign up
        </Link>
      </p>

      <section aria-labelledby="demo" className="mt-3 flex flex-col gap-2.5 rounded-card border-2 border-dashed border-primary bg-soft p-4">
        <h2 id="demo" className="text-lg font-bold">
          Demo account para sa mga hurado
        </h2>
        <p className="text-base leading-[1.35]">
          Username: <strong>{DEMO.id}</strong>
          <br />
          Password: <strong>{DEMO.password}</strong>
        </p>
        <ButtonLink variant="white" disabled={busy} onClick={() => go(DEMO.id, DEMO.password)}>
          Gamitin ang demo account
        </ButtonLink>
      </section>
    </PageHeader>
  );
}
