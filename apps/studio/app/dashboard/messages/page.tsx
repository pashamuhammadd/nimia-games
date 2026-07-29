import { Card, CardHeader, CardTitle, CardDescription } from "@nimia/ui";

export const metadata = { title: "Messages" };

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Phase 5</CardTitle>
          <CardDescription>
            Two-way conversation per project between you and the Nimia Games team.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
