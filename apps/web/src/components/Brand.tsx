interface BrandProps {
  compact?: boolean;
  light?: boolean;
  showCampus?: boolean;
}

export function Brand({
  compact = false,
  light = false,
  showCampus = false,
}: BrandProps) {
  return (
    <div
      className={`brand brand--image ${compact ? 'brand--compact' : ''} ${
        light ? 'brand--light' : ''
      }`}
    >
      <img
        src="/instituto-esparta.jpg"
        alt="Instituto Universitario Esparta"
      />
      {showCampus && <span className="brand__campus">Campus Guatacalca</span>}
    </div>
  );
}
