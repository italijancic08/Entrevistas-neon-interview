export default function Loader() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg">
      <div className="text-center">
        <p className="animate-pulse font-mono text-xs tracking-[0.5em] text-neon-cyan">CARGANDO ESCENA 3D</p>
        <div className="mx-auto mt-4 h-px w-56 overflow-hidden bg-ice/10">
          <div className="loader-bar h-full w-1/3 bg-neon-magenta" />
        </div>
      </div>
    </div>
  );
}