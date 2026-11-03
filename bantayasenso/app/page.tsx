"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getData } from "@/app/verisite/data";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    getData();
    const params = new URLSearchParams(window.location.search);
    const pid = params.get("project");
    if (pid) {
      router.replace(`/verisite/project/${pid}`);
      return;
    }

    const hasOAuthCallback =
      window.location.hash.includes("access_token") || params.has("code");

    if (!hasOAuthCallback) {
      router.replace("/verisite/home");
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && !session.user.is_anonymous) {
        getData();
        let ret = "/verisite/home";
        try {
          ret = sessionStorage.getItem("oauth_return") || "/verisite/home";
          sessionStorage.removeItem("oauth_return");
        } catch {}
        router.replace(ret);
      }
    });

    const timer = setTimeout(() => {
      router.replace("/verisite/home");
    }, 2500);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#57B5EE] text-lg font-bold text-[#1E2B30]">
      Binubuksan ang VeriSite...
    </main>
  );
}
