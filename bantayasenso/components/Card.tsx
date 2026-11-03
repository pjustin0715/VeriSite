import Link from "next/link";

// White rounded card. Pass `href` to make the whole card a link.
export default function Card({
  href,
  className = "",
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const style = `block overflow-hidden rounded-card bg-white text-ink no-underline shadow-card ${className}`;
  return href ? (
    <Link href={href} className={style}>
      {children}
    </Link>
  ) : (
    <div className={style}>{children}</div>
  );
}
