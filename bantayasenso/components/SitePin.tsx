import Icon from "@/components/Icon";
import { statuses } from "@/components/StatusLabel";
import type { Project } from "@/app/verisite/store";

// Round status pin with the report count, shared by the Map and the Priority list. `ring` marks the selected pin.
export default function SitePin({ project: p, ring }: { project: Pick<Project, "status" | "reportCount">; ring?: boolean }) {
  const s = statuses[p.status];
  return (
    <span
      className="relative flex size-[46px] flex-none items-center justify-center rounded-full border-[3px] border-white shadow-[0_6px_14px_rgba(20,60,90,.4)]"
      style={{ background: s.solid, boxShadow: ring ? `0 0 0 7px ${s.solid}55, 0 6px 14px rgba(20,60,90,.4)` : undefined }}
    >
      <Icon name={s.icon} size={20} color="#FFFFFF" strokeWidth={2.6} />
      <span className="absolute -top-[7px] -right-[11px] flex h-[25px] min-w-[25px] items-center justify-center rounded-[13px] border-2 border-white bg-yellow px-1 text-[13px] font-bold text-ink">
        {p.reportCount}
      </span>
    </span>
  );
}
