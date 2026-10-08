export function SectionIndex({ num, label }: { num: string; label: string }) {
  return (
    <div className="section-index mono" data-reveal>
      <span className="section-index__num">{num}</span>
      <span className="section-index__rule" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
