interface BrandProps {
  compact?: boolean;
  light?: boolean;
}

export function Brand({ compact = false, light = false }: BrandProps) {
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
    </div>
  );
}
