import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { Card, CardHeader, CardTitle, CardDescription, buttonVariants } from "@nimia/ui";
import { PublicNavbar } from "./components/PublicNavbar";
import { formatServicePrice } from "./lib/format";

const SHOWCASE_VIDEOS = [
  "https://www.nimiagames.com/gallery/animation-1.mp4",
  "https://www.nimiagames.com/gallery/animation-3.mp4",
  "https://www.nimiagames.com/gallery/animation-4.mp4",
];

export default async function StudioHomePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, base_price")
    .eq("is_active", true)
    .order("base_price", { ascending: true, nullsFirst: false })
    .limit(3);

  return (
    <>
      <PublicNavbar isAuthenticated={false} />

      <main>
        <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-28">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
            Bring your game to life.
          </h1>
          <p className="max-w-xl text-lg text-[var(--nimia-muted)]">
            Nimia Games Studio helps you create 3D animation, game trailers, and
            game assets. Tell us what you need, get a quote, and track your
            project from one dashboard.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/services" className={buttonVariants({ size: "lg" })}>
              Browse services
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Create an account
            </Link>
          </div>
        </section>

        <section className="border-t border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold">Recent work</h2>
              <p className="mt-1 text-[var(--nimia-muted)]">
                A sample of animation and game asset work from the Nimia Games team.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SHOWCASE_VIDEOS.map((src) => (
                <video
                  key={src}
                  src={src}
                  className="aspect-video w-full rounded-xl border border-[var(--nimia-border)] bg-black object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ))}
              <div className="relative overflow-hidden rounded-xl border border-[var(--nimia-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- external
                    marketing asset already hosted on apps/www, see docs/ARCHITECTURE.md
                    "Rancangan Arsitektur Tahap 5" assumption #1 */}
                <img
                  src="https://www.nimiagames.com/games/lifetopia-preview.png"
                  alt="Lifetopia game preview"
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  Lifetopia
                </span>
              </div>
            </div>
          </div>
        </section>

        {services && services.length > 0 ? (
          <section className="px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold">Services</h2>
                <p className="mt-1 text-[var(--nimia-muted)]">
                  Pricing is a starting point. You can negotiate the final price with our team.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {service.description}
                      </CardDescription>
                      <p className="pt-2 text-sm font-semibold text-[var(--nimia-crimson)]">
                        {formatServicePrice(service.base_price)}
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link href="/services" className={buttonVariants({ variant: "outline" })}>
                  See all services
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
