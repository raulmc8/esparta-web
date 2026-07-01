export function LoadingState({ label = 'Cargando información' }: { label?: string }) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}

