import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Invoice" };

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Invoice</h1>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir di Tahap 5</CardTitle>
          <CardDescription>
            Invoice, bukti pembayaran, dan receipt otomatis akan dibangun
            bersama integrasi Cloudinary &amp; Resend.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
