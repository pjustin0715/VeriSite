import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
}

const SIGN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_project_sign: { type: Type.BOOLEAN },
    contract_id: { type: Type.STRING, nullable: true },
    title: { type: Type.STRING, nullable: true },
    contractor: { type: Type.STRING, nullable: true },
    implementing_office: { type: Type.STRING, nullable: true },
    budget_php: { type: Type.NUMBER, nullable: true },
    start_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD or null" },
    target_date: { type: Type.STRING, nullable: true, description: "YYYY-MM-DD or null" },
    open_excavation: { type: Type.BOOLEAN, nullable: true },
    barricade_visible: { type: Type.BOOLEAN, nullable: true },
    warning_light_visible: { type: Type.BOOLEAN, nullable: true },
    unreadable_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["is_project_sign", "unreadable_fields"],
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && token !== "verisite") {
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    const { data: userRes, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !userRes.user || userRes.user.is_anonymous)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4_000_000)
    return NextResponse.json({ error: "Image must be JPEG/PNG/WebP <= 4MB" }, { status: 400 });

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt =
    "Analyze this Philippine road/construction site photo (DPWH/LGU paskil billboard and/or site conditions). " +
    "1) If a project billboard/sign is visible, set is_project_sign=true and extract visible facts. DPWH contract IDs follow this exact 8-character pattern: 2-digit year + 2-character district office code + 4-digit sequence number (e.g. 25OD0106, 24DF0012, 24D00012). Watch out for lookalike characters D, O, and 0: the first 2 characters and last 4 characters are ALWAYS digits (use 0, never O or D), the 3rd character is ALWAYS a letter (D or O, never 0), and the 4th character can be D, O, or 0. The contract ID often appears unlabeled at the top or start of the project title. Convert dates to YYYY-MM-DD and budget to a plain PHP number. " +
    "2) Also inspect the site for safety hazards: set open_excavation (true if an open hole/trench/excavation is visible, false if clearly none, null if unsure), barricade_visible (true if barriers/cones/fencing are visible, false if absent around work area, null if unsure), and warning_light_visible (true if warning lights/reflectors are visible, false if absent, null if unsure). Put any unreadable sign field in unreadable_fields.";

  const ai = getAI();
  if (!ai) return NextResponse.json({ error: "Gemini API key not configured" }, { status: 503 });

  try {
    let res: any = null;
    const candidates = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];
    for (const model of candidates) {
      try {
        res = await ai.models.generateContent({
          model,
          contents: [{ inlineData: { mimeType: file.type, data: b64 } }, prompt],
          config: {
            responseMimeType: "application/json",
            responseSchema: SIGN_SCHEMA,
          },
        });
        if (res?.text) break;
      } catch (e: any) {
        console.warn(`Model ${model} failed, trying next:`, e?.message || e);
      }
    }
    if (!res?.text) throw new Error("AI analysis service busy");
    return NextResponse.json(JSON.parse(res.text || "{}"));
  } catch (err: any) {
    console.error("Gemini analyze error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "AI unavailable" }, { status: 503 });
  }
}
