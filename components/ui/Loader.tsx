export default function Loader() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
      <div className="text-center">
        <p className="eyebrow muted animate-pulse">Cargando</p>
        <div className="mx-auto mt-4 h-px w-40 overflow-hidden bg-ice/10">
          <div className="loader-bar h-full w-1/3 bg-accent" />
        </div>
      </div>
    </div>
  );
}
