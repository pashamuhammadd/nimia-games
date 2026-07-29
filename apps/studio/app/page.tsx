import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { buttonVariants } from "@nimia/ui";

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Nimia Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-[var(--nimia-muted)]">
          Portal klien Nimia Games — ajukan pesanan, pantau progres proyek,
          dan kelola invoice dari satu tempat.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login" className={buttonVariants({ variant: "primary" })}>
          Masuk
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "outline" })}>
          Daftar
        </Link>
      </div>
    </main>
  );
}
