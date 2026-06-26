import Image from "next/image";

const menus = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Games", href: "#games" },
  { label: "Gallery", href: "#gallery" },
  { label: "Why Nimia", href: "#why-nimia" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-white/10 bg-[#07070A]/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">
       {/* Logo */}
<a href="#home" className="flex items-center gap-3">
  <Image
    src="/logo.png"
    alt="Nimia Games"
    width={44}
    height={44}
    priority
    className="h-10 w-10 object-contain transition duration-300 hover:scale-105 hover:rotate-3 md:h-11 md:w-11"
  />

  <div className="leading-none">
    <p className="text-[1.05rem] font-black tracking-wide text-white">
      NIMIA
    </p>

    <p className="nimia-gradient-text mt-[2px] text-[0.60rem] font-extrabold tracking-[0.28em]">
      GAMES
    </p>
  </div>
</a>

        {/* Menu */}
        <div className="hidden items-center gap-9 md:flex">
          {menus.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative text-sm font-medium text-white/65 transition hover:text-white"
            >
              {item.label}

              <span className="absolute -bottom-2 left-0 h-[2px] w-0 rounded-full nimia-gradient-bg transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* CTA */}
        <a
          href="https://studio.nimiagames.com"
          target="_blank"
          rel="noreferrer"
          className="nimia-button-primary rounded-full px-4 py-2.5 text-[13px] font-semibold tracking-wide"
        >
          Go to Studio
        </a>
      </nav>
    </header>
  );
}