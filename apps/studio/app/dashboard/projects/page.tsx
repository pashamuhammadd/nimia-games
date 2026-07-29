import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Projects</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 5</CardTitle>
          <CardDescription>
            Project status tracking (planning → in progress → revision →
            completed) along with an update timeline will be built alongside
            the invoice/PDF/email system.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
