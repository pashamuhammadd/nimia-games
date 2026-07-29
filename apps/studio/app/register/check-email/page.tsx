import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@nimia/ui";
import { PublicNavbar } from "../../components/PublicNavbar";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <div className="nimia-dark">
      <PublicNavbar isAuthenticated={false} />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a verification link. Open your email and click the
              link to activate your account, then{" "}
              <Link href="/login" className="font-medium text-[var(--nimia-pink)]">
                log in here
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--nimia-muted)]">
              Didn&apos;t get the email? Check your spam folder, or wait a few
              minutes and try signing up again.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
