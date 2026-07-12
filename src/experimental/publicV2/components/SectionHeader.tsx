type SectionHeaderProps = {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  align?: 'left' | 'center';
  className?: string;
};

export function SectionHeader({
  eyebrow,
  heading,
  subheading,
  align = 'left',
  className = '',
}: SectionHeaderProps) {
  const isCenter = align === 'center';
  return (
    <div className={`mb-10 ${isCenter ? 'text-center' : ''} ${className}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          {eyebrow}
        </p>
      )}
      <div
        className={`flex items-center gap-3 mb-3 ${isCenter ? 'justify-center' : ''}`}
      >
        <div className="w-7 h-0.5 bg-primary rounded-full flex-shrink-0" />
        <h2 className="text-2xl md:text-3xl font-bold leading-snug">
          {heading}
        </h2>
      </div>
      {subheading && (
        <p
          className={`text-muted-foreground text-base leading-relaxed ${
            isCenter ? 'mx-auto max-w-xl' : 'max-w-xl'
          }`}
        >
          {subheading}
        </p>
      )}
    </div>
  );
}
