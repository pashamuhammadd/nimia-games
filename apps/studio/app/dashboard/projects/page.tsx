import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Proyek" };

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Proyek</h1>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir di Tahap 5</CardTitle>
          <CardDescription>
            Pelacakan status proyek (planning → in progress → revisi →
            selesai) beserta timeline update akan dibangun bersama sistem
            invoice/PDF/email.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
