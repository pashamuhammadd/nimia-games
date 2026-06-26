export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-white/40 md:flex-row md:items-center">
        <p>© 2026 Nimia Games. All rights reserved.</p>

        <div className="flex gap-5">
          <a href="#games" className="hover:text-white">Games</a>
          <a href="#gallery" className="hover:text-white">Gallery</a>
          <a href="https://studio.nimiagames.com" target="_blank" className="hover:text-white">
            Studio
          </a>
        </div>
      </div>
    </footer>
  );
}