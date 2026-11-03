import Image from "next/image";
import Link from "next/link";
import BadgeIcon from "@/components/BadgeIcon";
import Icon from "@/components/Icon";
import { shortDate, type Report } from "@/app/verisite/store";

export const handled = { bago: "Bago", tinitingnan: "Tinitingnan", naaksyunan: "Naaksyunan" };

// One public report in a list (Project, All reports). Tapping it opens the report; `back` is the list's own URL.
export default function ReportRow({ report: r, back }: { report: Report; back: string }) {
  return (
    <Link
      href={`/verisite/report/${encodeURIComponent(r.id)}?back=${encodeURIComponent(back)}`}
      className="flex items-start gap-3 border-b border-line py-3 text-ink no-underline last:border-0"
    >
      <Image
        src={r.photo}
        alt="Litrato ng report"
        width={152}
        height={152}
        unoptimized={r.photo.startsWith("data:")}
        className="size-[76px] flex-none rounded-[14px] object-cover"
      />
      <span className="min-w-0 grow">
        <span className="flex items-center gap-[5px] text-base leading-[1.2] font-bold">
          {r.user}
          <BadgeIcon badge={r.badge} size={22} />
        </span>
        <span className="mt-0.5 line-clamp-2 text-15 leading-[1.3] [overflow-wrap:anywhere]">{r.note || r.issues.join(", ")}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-14 text-muted">
          {shortDate(r.createdAt)} • {handled[r.status ?? "bago"]}
          {r.confirmed && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#1E7A50]">
              <Icon name="check" size={15} color="#2E9E6B" strokeWidth={2.8} />
              Kumpirmado
            </span>
          )}
        </span>
      </span>
      <span className="self-center">
        <Icon name="next" size={20} color="#5F6E74" />
      </span>
    </Link>
  );
}
