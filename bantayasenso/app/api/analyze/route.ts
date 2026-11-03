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

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: userRes, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userRes.user || userRes.user.is_anonymous)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4_000_000)
    return NextResponse.json({ error: "Image must be JPEG/PNG/WebP <= 4MB" }, { status: 400 });

  const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const prompt =
    "Read this Philippine government construction billboard (DPWH/LGU paskil). Extract only facts visible in the photo. DPWH contract IDs follow this exact 8-character pattern: 2-digit year + 2-letter district office code + 4-digit sequence number (e.g. 25OD0106, 24DF0012). The contract ID often appears unlabeled as the first code at the top or start of the project title — look for a code matching this pattern even if it is not explicitly labeled 'Contract ID'. Make sure to capture both letters of the office code. Convert dates to YYYY-MM-DD and budget to a plain PHP number. Put any field you cannot clearly read in unreadable_fields.";

  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ inlineData: { mimeType: file.type, data: b64 } }, prompt],
      config: {
        responseMimeType: "application/json",
        responseSchema: SIGN_SCHEMA,
      },
    });
    return NextResponse.json(JSON.parse(res.text || "{}"));
  } catch (err: any) {
    console.error("Gemini analyze error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "AI unavailable" }, { status: 503 });
  }
}
