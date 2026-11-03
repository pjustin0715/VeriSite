"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import BadgeIcon from "@/components/BadgeIcon";
import Card from "@/components/Card";
import Icon, { type IconName } from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { logOut, setLargeText, today, useData, useLargeText } from "../data";
import { userOf } from "../store";

const rowClass = "flex min-h-[64px] w-full cursor-pointer items-center gap-3.5 px-3.5 py-3 text-left text-ink no-underline";

const RowIcon = ({ icon, color = "#1C86CC" }: { icon: IconName; color?: string }) => (
  <span className="flex size-[42px] flex-none items-center justify-center rounded-[14px]" style={{ background: color }}>
    <Icon name={icon} color="#FFFFFF" strokeWidth={2.2} />
  </span>
);

// A row that opens another page (or logs out): icon, title, detail and an arrow.
function Row({ icon, color, title, detail }: { icon: IconName; color?: string; title: string; detail?: string }) {
  return (
    <>
      <RowIcon icon={icon} color={color} />
      <span className="grow">
        <span className="block text-lg leading-[1.2] font-bold">{title}</span>
        {detail && <span className="block text-base leading-[1.25] font-semibold text-muted">{detail}</span>}
      </span>
      <Icon name="next" color="#5F6E74" />
    </>
  );
}

// The logged-in account (W-Profile): numbers, links to the account screens, text size and logout.
export default function ProfilePage() {
  const router = useRouter();
  const data = useData();
  const large = useLargeText();
  const user = data && userOf(data, today());
  if (!data || !user) return null;
  const followed = data.projects.filter((p) => user.followed.includes(p.id)).length; // skips removed projects

  return (
    <PageHeader
      image="head-happy"
      back="/verisite/home"
      title={user.username}
      subtitle={
        <span className="mt-1.5 flex items-center gap-2 text-lg font-semibold">
          {user.badge ? (
            <>
              <BadgeIcon badge={user.badge} size={26} />
              {user.badge} na badge
            </>
          ) : (
            "Wala pang badge"
          )}
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {[
          [user.reportCount, "Report"],
          [`${user.streak} araw`, "Streak"],
          [user.badge ?? "Wala pa", "Badge"],
        ].map(([value, label]) => (
          <Card key={label} href="/verisite/badges?from=profile" className="px-1 py-2.5 text-center">
            <strong className="block text-xl leading-[1.2] font-bold text-link">{value}</strong>
            <span className="text-base font-semibold text-muted">{label}</span>
          </Card>
        ))}
      </div>

      <Card className="divide-y divide-line">
        <Link href="/verisite/my-reports" className={rowClass}>
          <Row icon="doc" title="Aking mga report" detail={`${user.reportCount} report`} />
        </Link>
        <Link href="/verisite/following" className={rowClass}>
          <Row icon="bookmark" title="Sinusundang proyekto" detail={`${followed} proyekto`} />
        </Link>
        <Link href="/verisite/updates" className={rowClass}>
          <Row icon="bell" title="Mga update" detail={user.unread ? `${user.unread} bago` : "Walang bago"} />
        </Link>
      </Card>

      {/* A setting, not a link: no arrow, the choice is made right here. */}
      <Card className="flex flex-col gap-3 px-3.5 py-3">
        <span className="flex items-center gap-3.5">
          <RowIcon icon="text" />
          <span id="text-size" className="text-lg leading-[1.2] font-bold">
            Laki ng letra
          </span>
        </span>
        <span role="radiogroup" aria-labelledby="text-size" className="grid grid-cols-2 gap-1 rounded-[16px] bg-soft p-1">
          {(
            [
              [false, "Karaniwan"],
              [true, "Malaki"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={large === value}
              onClick={() => setLargeText(value)}
              className={`min-h-12 cursor-pointer rounded-[13px] px-2 text-base font-bold ${large === value ? "bg-primary text-white shadow-card" : "text-ink"}`}
            >
              {label}
            </button>
          ))}
        </span>
      </Card>

      <Card>
        <button
          type="button"
          onClick={() => {
            logOut();
            router.replace("/verisite/welcome");
          }}
          className={rowClass}
        >
          <Row icon="logout" color="#C9342B" title="Mag-logout" />
        </button>
      </Card>
    </PageHeader>
  );
}
