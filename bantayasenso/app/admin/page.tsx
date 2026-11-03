"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  async function loadQueue() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: adm } = await supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adm) return;
    setIsAdmin(true);
    const { data } = await supabase
      .from("reports")
      .select("id, project_id, kind, note, photo_path, ai_flags, status, admin_response, created_at")
      .order("created_at", { ascending: false });
    setReports(data || []);
  }

  useEffect(() => { loadQueue(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.signInWithPassword({ email, password });
    await loadQueue();
  }

  async function updateReport(id: string, status: string, admin_response: string) {
    await supabase.from("reports").update({ status, admin_response }).eq("id", id);
    await loadQueue();
  }

  async function deleteReport(id: string) {
    await supabase.from("reports").delete().eq("id", id);
    await loadQueue();
  }

  if (!isAdmin) {
    return (
      <form onSubmit={login} className="mx-auto max-w-sm space-y-3 p-6 text-white">
        <h1 className="text-lg font-bold">LGU / Admin Sign In</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded bg-slate-800 p-2" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded bg-slate-800 p-2" />
        <button className="w-full rounded bg-emerald-500 py-2 font-bold text-slate-950">Sign In</button>
      </form>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-950 p-4 text-white text-xs space-y-3">
      <h1 className="text-lg font-bold">Moderation & Response Queue ({reports.length})</h1>
      {reports.map((r) => (
        <div key={r.id} className="space-y-2 rounded-xl bg-slate-900 p-3">
          <div className="flex justify-between text-slate-400">
            <span>{r.kind.toUpperCase()} · Status: <b>{r.status}</b></span>
            <button onClick={() => deleteReport(r.id)} className="text-red-400">Delete</button>
          </div>
          {r.note && <p>{r.note}</p>}
          {r.ai_flags?.summary && <p className="text-amber-300">AI: {r.ai_flags.summary}</p>}
          <div className="flex gap-2">
            {["open", "acknowledged", "resolved"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  const reply = prompt("Public response (optional):", r.admin_response || "");
                  if (reply !== null) updateReport(r.id, st, reply);
                }}
                className="rounded bg-slate-800 px-2.5 py-1 capitalize"
              >
                Mark {st}
              </button>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}

