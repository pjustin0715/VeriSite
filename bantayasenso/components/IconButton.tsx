import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";

// White 46px square button with one icon (back, bookmark, bell, filter). `label` is read by screen readers.
export default function IconButton({
  href,
  icon,
  label,
  children,
}: {
  href: string;
  icon?: IconName;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative flex size-[46px] flex-none items-center justify-center rounded-2xl bg-white text-ink shadow-[0_6px_14px_rgba(20,80,120,.18)] hover:text-link"
    >
      {icon && <Icon name={icon} size={23} />}
      {children}
    </Link>
  );
}
