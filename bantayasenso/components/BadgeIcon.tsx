import { badges, type BadgeName } from "@/app/verisite/store";

// Medal with ribbon, colored by badge level (Baguhan ... Diyamante).
export default function BadgeIcon({ badge, size = 32 }: { badge: BadgeName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`Badge ${badge}`} className="flex-none">
      <path d="M12 22L8 38l12-5 12 5-4-16z" fill="#1C86CC" />
      <circle cx="20" cy="17" r="15" fill={badges.find((b) => b.name === badge)?.color} />
      <circle cx="20" cy="17" r="11.5" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="1.5" />
      <path d="M20 8.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z" fill="#FFFFFF" />
    </svg>
  );
}
