import ButtonLink from "@/components/ButtonLink";

// Shown for a link to a project, site or report that doesn't exist (mistyped, or removed).
export default function NotFound({
  back = "/verisite/home",
  label = "Bumalik sa Simula",
  title = "Hindi nakita ang proyekto",
  text = "Maaaring mali ang link o wala na ang proyektong ito.",
}: {
  back?: string;
  label?: string;
  title?: string;
  text?: string;
}) {
  return (
    <main className="flex grow flex-col justify-center gap-4 px-5 text-center">
      <h1 className="text-[27px] font-bold">{title}</h1>
      <p className="text-base text-muted">{text}</p>
      <ButtonLink href={back}>{label}</ButtonLink>
    </main>
  );
}
