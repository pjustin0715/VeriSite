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

function Row({ icon, color = "#1C86CC", title, detail }: { icon: IconName; color?: string; title: string; detail?: string }) {
  return (
    <>
      <span className="flex size-[42px] flex-none items-center justify-center rounded-[14px]" style={{ background: color }}>
        <Icon name={icon} color="#FFFFFF" strokeWidth={2.2} />
      </span>
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
      narrow
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

      <Card>
        <button type="button" role="switch" aria-checked={large} onClick={() => setLargeText(!large)} className={rowClass}>
          <Row icon="text" title="Laki ng letra" detail={large ? "Malaki" : "Karaniwan"} />
        </button>
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
