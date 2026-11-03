import Icon, { type IconName } from "@/components/Icon";

// solid = status color background (Aking mga report); soft = white pill on a picture (project cards); tint = light pill on a white card.
export const statuses = {
  lampas: { label: "Lampas sa petsa", solid: "#C9342B", soft: "#B3271F", icon: "warning" },
  malapit: { label: "Malapit na sa petsa", solid: "#D9861E", soft: "#855708", icon: "clock" },
  ayon: { label: "Ayon sa plano", solid: "#2E9E6B", soft: "#1E7A50", icon: "check" },
  tapos: { label: "Tapos na", solid: "#2E9E6B", soft: "#1E7A50", icon: "check" },
  "di-kumpirmado": { label: "Di kumpirmado", solid: "#6B7A80", soft: "#5F6E74", icon: "question" },
  bago: { label: "Bago", solid: "#6B7A80", soft: "#5F6E74", icon: "question" },
  tinitingnan: { label: "Tinitingnan", solid: "#D9861E", soft: "#855708", icon: "clock" },
  naaksyunan: { label: "Naaksyunan", solid: "#2E9E6B", soft: "#1E7A50", icon: "check" },
} satisfies Record<string, { label: string; solid: string; soft: string; icon: IconName }>;

export type Status = keyof typeof statuses;

export default function StatusLabel({
  status,
  variant = "solid",
  label,
}: {
  status: Status;
  variant?: "solid" | "soft" | "tint";
  label?: string; // override text, e.g. "Lampas 30 araw"
}) {
  const s = statuses[status];
  const solid = variant === "solid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-3 text-[15px] font-bold ${
        solid ? "h-8 text-white" : variant === "soft" ? "h-[30px] bg-white/95 shadow-[0_4px_10px_rgba(0,0,0,.14)]" : "h-8"
      }`}
      style={solid ? { background: s.solid } : { color: s.soft, background: variant === "tint" ? `${s.solid}1F` : undefined }}
    >
      <Icon name={s.icon} size={16} strokeWidth={2.6} color={solid ? "#FFFFFF" : s.soft} />
      {label ?? s.label}
    </span>
  );
}
