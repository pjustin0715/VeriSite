import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
    unreadable_fields: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["is_project_sign", "unreadable_fields"],
};

const HAZARD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    open_excavation: { type: Type.BOOLEAN, nullable: true },
    barricade_visible: { type: Type.BOOLEAN, nullable: true },
    warning_light_visible: { type: Type.BOOLEAN, nullable: true },
    concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: ["concerns", "summary"],
};

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: userRes, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const mode = form.get("mode");
  const file = form.get("image");
  if ((mode !== "sign" && mode !== "hazard") || !(file instanceof File))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4_000_000)
    return NextResponse.json({ error: "Image must be JPEG/PNG/WebP <= 4MB" }, { status: 400 });

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt =
    mode === "sign"
      ? "Read this Philippine government construction billboard (DPWH/LGU paskil). Extract only facts visible in the photo. DPWH contract IDs are strictly 8 characters formatted as 2-digit year, 2-letter district office code, and 4-digit sequence number (e.g. 25OD0106, 24DF0012). Make sure to capture both letters of the office code. Convert dates to YYYY-MM-DD and budget to a plain PHP number. Put any field you cannot clearly read in unreadable_fields."
      : "Inspect this road-work photo for pedestrian/motorist hazards. Set booleans to null if unclear from the angle/lighting. Use cautious, advisory wording.";

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ inlineData: { mimeType: file.type, data: b64 } }, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: mode === "sign" ? SIGN_SCHEMA : HAZARD_SCHEMA,
      },
    });
    return NextResponse.json(JSON.parse(res.text || "{}"));
  } catch (err: any) {
    console.error("Gemini analyze error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "AI unavailable" }, { status: 503 });
  }
}

