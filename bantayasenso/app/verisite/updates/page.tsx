"use client";

import { useRouter } from "next/navigation";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { markRead, today, useData } from "../data";
import { addDays, displayText, shortDate, updatesOf, type UpdateKind } from "../store";

const kinds: Record<UpdateKind, { title: string; icon: IconName; color: string }> = {
  tinitingnan: { title: "Tinitingnan na ang report mo", icon: "clock", color: "#1C86CC" },
  naaksyunan: { title: "Naaksyunan ang report mo", icon: "check", color: "#2E9E6B" },
  sinusundan: { title: "May bago sa sinusundan mo", icon: "bookmark", color: "#1C86CC" },
};

function ago(iso: string) {
  const mins = (Date.now() - Date.parse(iso)) / 6e4;
  const day = new Date(iso).toLocaleDateString("sv");
  if (mins < 60) return "Ngayon lang";
  if (day === today()) return `${Math.floor(mins / 60)} oras`;
  if (day === addDays(today(), -1)) return "Kahapon";
  return shortDate(iso);
}

// Updates for the logged-in user (W-Updates): LGU moves on their reports and news on followed projects.
// Opening one marks it read and opens its project.
export default function UpdatesPage() {
  const router = useRouter();
  const data = useData();
  if (!data) return null;
  const updates = updatesOf(data);

  return (
    <PageHeader back="/verisite/home" title="Mga Update">
      {!updates.length && (
        <Card className="flex flex-col items-center gap-3 p-5 text-center">
          <p className="text-lg font-bold">Wala pang update</p>
          <p className="text-base text-muted">Dito lalabas kapag may galaw ang report mo o ang mga proyektong sinusundan mo.</p>
          <ButtonLink href="/verisite/home">Tingnan ang mga proyekto</ButtonLink>
        </Card>
      )}
      {updates.map((u) => {
        const k = kinds[u.kind] ?? kinds.sinusundan;
        const p = data.projects.find((x) => x.id === u.projectId);
        return (
          <Card key={u.id}>
            <button
              type="button"
              onClick={() => {
                markRead(u.id);
                if (p) router.push(`/verisite/project/${p.id}?from=updates`);
              }}
              aria-label={`${k.title}, ${p ? displayText(p.place) : "wala na ang proyekto"}${u.read ? "" : ", bago"}`}
              className="flex w-full cursor-pointer items-center gap-3.5 px-3.5 py-3 text-left"
            >
              <span className="flex size-[44px] flex-none items-center justify-center rounded-[14px]" style={{ background: k.color }}>
                <Icon name={k.icon} color="#FFFFFF" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 grow">
                <span className="block text-lg leading-[1.2] font-bold">{k.title}</span>
                <span className="block text-base font-semibold text-muted">
                  {p ? displayText(p.place) : "Wala na ang proyekto"} • {ago(u.createdAt)}
                </span>
              </span>
              {!u.read && <span aria-hidden="true" className="size-2.5 flex-none rounded-full bg-lampas" />}
            </button>
          </Card>
        );
      })}
    </PageHeader>
  );
}
