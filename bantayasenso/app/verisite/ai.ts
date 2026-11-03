// Mock AI. Readings use the same fields as SIGN_SCHEMA and HAZARD_SCHEMA in app/api/analyze/route.ts.
// shortcut: canned readings; replace analyzePhoto's body with a POST to /api/analyze (sign + hazard) when the backend is wired up.
import { addDays, type ProjectRecord } from "./store";

export type SignReading = {
  contract_id: string | null;
  title: string | null;
  contractor: string | null;
  implementing_office: string | null;
  budget_php: number | null;
  start_date: string | null; // YYYY-MM-DD
  target_date: string | null;
};
// null = the AI can't tell.
export type HazardReading = { open_excavation: boolean | null; barricade_visible: boolean | null; warning_light_visible: boolean | null };
export type AiResult = { sign: SignReading | null; hazard: HazardReading };

// Rejects photos too dark to read, which sends the user to the "Hindi malinaw ang litrato" screen.
export async function analyzePhoto(photo: string, site: ProjectRecord): Promise<AiResult> {
  const [light] = await Promise.all([brightness(photo), new Promise((r) => setTimeout(r, 2400))]);
  if (light < 25) throw new Error("Photo too dark");
  // The mock "reads" the site's own paskil with a wrong budget and end date.
  return {
    sign: {
      contract_id: site.contractId,
      title: site.name,
      contractor: site.contractor,
      implementing_office: site.office,
      budget_php: site.budget + 350_000,
      start_date: site.startDate,
      target_date: addDays(site.targetDate, 42),
    },
    hazard: { open_excavation: true, barricade_visible: false, warning_light_visible: null },
  };
}

// Average brightness 0-255 of the photo, sampled at 16x16.
async function brightness(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, 16, 16);
  const px = ctx.getImageData(0, 0, 16, 16).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += (px[i] + px[i + 1] + px[i + 2]) / 3;
  return sum / 256;
}
