import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center md:px-6">
      <p className="nimia-accent-text font-display text-5xl font-bold md:text-6xl">
        404
      </p>

      <h1 className="mt-5 text-xl font-black text-white md:text-2xl">
        Halaman ini tidak ditemukan.
      </h1>

      <p className="mt-3 max-w-md text-sm text-white/55">
        Sepertinya dunia yang kamu cari belum dibuat, atau linknya sudah
        berubah. Yuk balik ke beranda Nimia Games.
      </p>

      <Link
        href="/"
        className="nimia-button-primary mt-6 inline-flex rounded-full px-5 py-2.5 text-xs font-black"
      >
        Kembali ke Beranda
      </Link>
    </section>
  );
}
