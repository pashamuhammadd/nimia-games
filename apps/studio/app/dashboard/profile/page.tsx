import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label } from "@nimia/ui";
import { Avatar } from "../../components/dashboard/Avatar";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, whatsapp, country")
    .eq("user_id", user!.id)
    .single();

  const rows: { label: string; value: string }[] = [
    { label: "Full name", value: profile?.full_name || "Not set" },
    { label: "Email", value: user?.email ?? "Not set" },
    { label: "Company", value: client?.company_name || "Not set" },
    { label: "WhatsApp", value: client?.whatsapp || "Not set" },
    { label: "Country", value: client?.country || "Not set" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-4">
            {/* Default avatar (3 Agustus 2026, per user request) — see
                components/dashboard/Avatar.tsx: shows profile.avatar_url
                once a real photo exists, otherwise a Nimia-colored generic
                person silhouette instead of a plain initial letter. */}
            <Avatar avatarUrl={profile?.avatar_url} name={profile?.full_name ?? undefined} size="md" />
            <div>
              <CardTitle>Account information</CardTitle>
              <CardDescription>
                Profile editing (including uploading a real photo) will be available in a future
                phase. For now, contact admin if any information needs updating.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label}>
              <Label className="mb-0.5">{row.label}</Label>
              <p className="text-sm">{row.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
