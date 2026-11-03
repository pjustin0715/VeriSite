import ButtonLink from "@/components/ButtonLink";

// Shown for a link to a project or site that doesn't exist (mistyped, or removed).
export default function NotFound({ back = "/verisite/home", label = "Bumalik sa Simula" }: { back?: string; label?: string }) {
  return (
    <main className="flex grow flex-col justify-center gap-4 px-5 text-center">
      <h1 className="text-[27px] font-bold">Hindi nakita ang proyekto</h1>
      <p className="text-base text-muted">Maaaring mali ang link o wala na ang proyektong ito.</p>
      <ButtonLink href={back}>{label}</ButtonLink>
    </main>
  );
}
