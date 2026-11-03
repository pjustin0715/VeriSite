import Link from "next/link";
import BadgeIcon from "@/components/BadgeIcon";
import BottomNav from "@/components/BottomNav";
import ButtonLink from "@/components/ButtonLink";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import IconButton from "@/components/IconButton";
import Logo from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import ProjectCard from "@/components/ProjectCard";
import StatusLabel, { type Status } from "@/components/StatusLabel";
import { sample } from "./sample-data";
import { badges, projectsOf, seedState } from "./store";

// Fixed day so this static preview renders the same at build time.
const projects = projectsOf(seedState(sample, "2026-11-03"), "2026-11-03");

// Developer preview of the shared VeriSite parts. Not part of the app flow.
const colors = ["ink", "muted", "header", "primary", "link", "soft", "page", "line", "yellow", "lampas", "malapit", "ayon", "unconfirmed", "streak"];
const statuses: Status[] = ["lampas", "malapit", "ayon", "di-kumpirmado", "bago", "tinitingnan", "naaksyunan"];

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-4 text-lg font-bold text-header">{children}</h2>;
}

export default function PreviewPage() {
  return (
    <>
      <PageHeader back="/verisite/welcome" title="Mga bahagi ng VeriSite" subtitle="Preview ng disenyo">
        <Link href="/verisite/welcome" className="font-semibold text-link">
          Buksan ang Welcome →
        </Link>

        <Heading>Kulay</Heading>
        <div className="grid grid-cols-4 gap-2">
          {colors.map((c) => (
            <div key={c} className="text-center text-14">
              <div className="h-10 rounded-xl border border-line" style={{ background: `var(--color-${c})` }} />
              {c}
            </div>
          ))}
        </div>

        <Heading>Letra (Outfit)</Heading>
        <p className="text-[28px] font-bold">Bold 700</p>
        <p className="text-xl font-semibold">Semibold 600</p>
        <p className="text-base">Medium 500, pinakamaliit na 14px</p>

        <Heading>Mga button</Heading>
        <ButtonLink href="/verisite">Dilaw na button</ButtonLink>
        <ButtonLink href="/verisite" variant="white">
          Puting button
        </ButtonLink>
        <div className="flex gap-2">
          <IconButton href="/verisite" icon="back" label="Bumalik" />
          <IconButton href="/verisite" icon="bookmark" label="I-save" />
          <IconButton href="/verisite" icon="bell" label="Mga update">
            <span className="absolute top-[9px] right-2.5 size-[9px] rounded-full bg-lampas" />
          </IconButton>
          <IconButton href="/verisite" icon="filter" label="Filter" />
        </div>

        <Heading>Mga status label</Heading>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <StatusLabel key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 rounded-card bg-header p-3">
          {statuses.slice(0, 4).map((s) => (
            <StatusLabel key={s} status={s} variant="soft" />
          ))}
        </div>

        <Heading>Mga badge</Heading>
        <div className="flex gap-3">
          {badges.map((b) => (
            <div key={b.name} className="flex flex-col items-center text-14">
              <BadgeIcon badge={b.name} size={40} />
              {b.name}
            </div>
          ))}
        </div>

        <Heading>Mga card</Heading>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="grow" />
            <Icon name="flame" color="#E8681C" strokeWidth={2.3} />
            <span className="text-lg font-bold">7</span>
          </div>
        </Card>
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}

        <Heading>Bottom nav</Heading>
        <p className="text-muted">Nasa ibaba ng screen.</p>
      </PageHeader>
      <BottomNav active="home" />
    </>
  );
}
