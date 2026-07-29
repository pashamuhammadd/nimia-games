"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { orderFormSchema, type OrderFormValues } from "@nimia/validators";

export type CreateOrderResult = { success: true } | { success: false; error: string };

// Called directly from the client component (OrderForm's react-hook-form
// onSubmit) rather than as a <form action>, since react-hook-form already
// owns client-side validation/state — this still re-validates with the
// SAME zod schema server-side before touching the database, because
// client-side validation alone is never trustworthy.
export async function createOrderAction(values: OrderFormValues): Promise<CreateOrderResult> {
  const parsed = orderFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Sesi kamu berakhir, silakan masuk lagi." };
  }

  // clients row is auto-created on signup by the handle_new_auth_user
  // trigger (0007) — if it's missing here, something upstream broke.
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (clientError || !client) {
    return {
      success: false,
      error: "Profil klien tidak ditemukan. Coba muat ulang halaman atau hubungi admin.",
    };
  }

  const {
    service_id,
    full_name,
    company_name,
    email,
    whatsapp,
    country,
    budget,
    deadline,
    description,
    reference_link,
  } = parsed.data;

  const { error } = await supabase.from("orders").insert({
    client_id: client.id,
    service_id,
    full_name,
    company_name: company_name || null,
    email,
    whatsapp: whatsapp || null,
    country: country || null,
    budget: budget || null,
    deadline: deadline || null,
    description,
    reference_link: reference_link || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}
