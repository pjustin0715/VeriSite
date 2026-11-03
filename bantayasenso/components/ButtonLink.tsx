import Link from "next/link";

const styles = {
  yellow: "bg-[#F6C744] shadow-[0_10px_20px_rgba(226,165,24,.28)]",
  white: "bg-white shadow-[0_1px_2px_rgba(20,80,120,0.06),0_14px_30px_rgba(20,80,120,0.10)]",
};

// Main 60px-tall button that navigates to another screen. Without `href` it submits its form.
export default function ButtonLink({
  href,
  variant = "yellow",
  children,
}: {
  href?: string;
  variant?: keyof typeof styles;
  children: React.ReactNode;
}) {
  const className = `flex h-[60px] w-full cursor-pointer items-center justify-center rounded-[18px] text-lg font-bold text-[#1E2B30] no-underline hover:text-[#136AA6] ${styles[variant]}`;
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <button type="submit" className={className}>
      {children}
    </button>
  );
}
