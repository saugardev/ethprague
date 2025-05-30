interface HeroProps {
  title: string;
  subtitle: string;
  showCta?: boolean;
  ctaText?: string;
}

export default function Hero({ title, subtitle, showCta = true, ctaText = "Touch Grass" }: HeroProps) {
  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-4xl font-bold max-w-xl text-center">{title}</h1>
      <div className="flex flex-col items-center">
        <div className="mt-5 text-center">
          {subtitle}
        </div>
        {showCta && (
          <div className="flex mt-5 gap-5">
            <button className="btn btn-success btn-soft">{ctaText}</button>
          </div>
        )}
      </div>
    </div>
  );
}