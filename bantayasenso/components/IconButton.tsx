import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";

// White 46px square button with one icon (back, close, bookmark, bell). `label` is read by screen readers.
// With `href` it navigates; with `onClick` it is a button (`pressed` marks a toggle such as follow).
export default function IconButton({
  href,
  onClick,
  pressed,
  icon,
  label,
  children,
}: {
  href?: string;
  onClick?: () => void;
  pressed?: boolean;
  icon?: IconName;
  label: string;
  children?: React.ReactNode;
}) {
  const className =
    "relative flex size-[46px] flex-none cursor-pointer items-center justify-center rounded-2xl bg-white text-ink shadow-[0_6px_14px_rgba(20,80,120,.18)] hover:text-link";
  const content = (
    <>
      {icon && <Icon name={icon} size={23} />}
      {children}
    </>
  );
  return href ? (
    <Link href={href} aria-label={label} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed} className={className}>
      {content}
    </button>
  );
}
