export default function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`py-4 px-6 border-t border-[#4a4455]/20 bg-[#100b1c]/80 dark:bg-[#100b1c]/80 light:bg-white/80 backdrop-blur-xl text-center text-xs text-[#958da1] shrink-0 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
          <span className="font-semibold text-white/90">My Trello</span>
          <span className="text-[#4a4455]">•</span>
          <span className="text-[#ccc3d8]">Violet Prism UI</span>
        </div>
        <p className="font-medium text-[#ccc3d8]/90">
          Diseñado por <strong className="text-white">Alan Canto</strong> - Todos los Derechos <span className="text-[#d2bbff] font-bold">ACDev</span>
        </p>
      </div>
    </footer>
  );
}
