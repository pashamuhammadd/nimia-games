import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  buttonVariants,
  cn,
} from "@nimia/ui";
import { PublicNavbar } from "../components/PublicNavbar";
import { formatServicePrice } from "../lib/format";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, base_price")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={!!user} />

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="nimia-font-display text-3xl font-bold tracking-tight">Services</h1>
          <p className="mx-auto mt-2 max-w-lg text-[var(--nimia-muted)]">
            Pricing below is a starting point for each service. Once you submit
            an order, our team reviews it and you can negotiate the final
            price before paying.
          </p>
        </div>

        {services && services.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id} className="flex flex-col">
                <CardHeader className="flex-1">
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                  <p className="pt-2 text-sm font-semibold text-[var(--nimia-pink)]">
                    {formatServicePrice(service.base_price)}
                  </p>
                </CardHeader>
                <CardFooter>
                  <Link
                    href={`/dashboard/orders?service=${service.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "w-full bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
                    )}
                  >
                    Order this service
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-[var(--nimia-muted)]">
            No services are available right now. Check back soon.
          </p>
        )}
      </main>
    </div>
  );
}
