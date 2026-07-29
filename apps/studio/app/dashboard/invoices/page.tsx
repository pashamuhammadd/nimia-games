import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Invoices</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 5</CardTitle>
          <CardDescription>
            Automatic invoices, payment proof, and receipts will be built
            alongside the Cloudinary &amp; Resend integration.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
