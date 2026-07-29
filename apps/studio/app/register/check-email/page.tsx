import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@nimia/ui";

export const metadata: Metadata = { title: "Cek email kamu" };

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Cek email kamu</CardTitle>
          <CardDescription>
            Kami sudah mengirim link verifikasi. Buka email kamu dan klik link
            tersebut untuk mengaktifkan akun, lalu{" "}
            <Link href="/login" className="font-medium text-[var(--nimia-crimson)]">
              masuk di sini
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--nimia-muted)]">
            Tidak menerima email? Cek folder spam, atau tunggu beberapa menit
            lalu coba daftar ulang.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
