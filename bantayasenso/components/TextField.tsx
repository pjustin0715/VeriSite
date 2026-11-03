import { useId } from "react";
import Icon, { type IconName } from "@/components/Icon";

// Labelled form input with an icon and an error line under it (Login, Signup, Forgot password).
export default function TextField({
  label,
  icon,
  error,
  ...input
}: { label: string; icon: IconName; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-lg font-bold">
        {label}
      </label>
      <span
        className={`mt-2 flex h-[58px] items-center gap-3 rounded-[18px] border-2 bg-white px-4 ${error ? "border-lampas" : "border-line focus-within:border-primary"}`}
      >
        <Icon name={icon} color="#5F6E74" />
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-full min-w-0 grow bg-transparent text-lg font-semibold outline-none placeholder:font-medium placeholder:text-muted"
          {...input}
        />
      </span>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[15px] leading-[1.3] font-semibold text-lampas">
          {error}
        </p>
      )}
    </div>
  );
}
