import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Label } from "@nimia/ui";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("clients")
    .select("company_name, whatsapp, country")
    .eq("user_id", user!.id)
    .single();

  const rows: { label: string; value: string }[] = [
    { label: "Nama lengkap", value: profile?.full_name || "—" },
    { label: "Email", value: user?.email ?? "—" },
    { label: "Perusahaan", value: client?.company_name || "—" },
    { label: "WhatsApp", value: client?.whatsapp || "—" },
    { label: "Negara", value: client?.country || "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Profil</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Informasi akun</CardTitle>
          <CardDescription>
            Edit profil akan tersedia di tahap berikutnya — untuk sekarang,
            hubungi admin jika ada data yang perlu diperbarui.
          </CardDescription>
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
