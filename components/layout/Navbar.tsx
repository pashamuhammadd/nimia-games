export default function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="text-lg font-bold tracking-tight text-white">
          Nimia Games
        </div>

        <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
          <a href="#about" className="hover:text-white">About</a>
          <a href="#games" className="hover:text-white">Games</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </div>

        <a
          href="https://studio.nimiagames.com"
          target="_blank"
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
        >
          Build With Us
        </a>
      </nav>
    </header>
  );
}