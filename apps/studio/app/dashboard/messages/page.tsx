import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Pesan" };

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Pesan</h1>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir di Tahap 5</CardTitle>
          <CardDescription>
            Percakapan dua arah per proyek antara kamu dan tim Nimia Games.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
