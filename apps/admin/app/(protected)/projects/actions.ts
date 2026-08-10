"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { cloudinary } from "../../lib/cloudinary";
import { isAdminTierRole } from "../../lib/roles";

export type ProjectActionResult = { success: true } | { success: false; error: string };

// Status/progress/date writes below rely on projects_admin_write
// (packages/db/migrations/0006_rls_policies.sql), which gates on
// public.is_admin() — this file is convenience/UX, not the security
// boundary itself, same convention as every other actions.ts in this app.
export async function updateProjectStatusAction(projectId: string, status: string): Promise<ProjectActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  return { success: true };
}

export async function updateProjectProgressAction(
  projectId: string,
  progress: number,
): Promise<ProjectActionResult> {
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    return { success: false, error: "Progress must be between 0 and 100." };
  }
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("projects")
    .update({ progress: Math.round(progress) })
    .eq("id", projectId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  return { success: true };
}

export async function updateProjectDatesAction(
  projectId: string,
  startDate: string | null,
  deadline: string | null,
): Promise<ProjectActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("projects")
    .update({ start_date: startDate || null, deadline: deadline || null })
    .eq("id", projectId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  return { success: true };
}

export type UploadSignatureResult =
  | {
      success: true;
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
    }
  | { success: false; error: string };

// Cloudinary signing has nothing to do with Postgres RLS (it's not a DB
// write), so unlike the actions above, this one DOES need its own explicit
// role check — without it, any authenticated user who could reach this
// Server Action (not just staff browsing /projects, which the (protected)
// layout already gates) could mint a valid signed-upload URL. Mirrors
// apps/studio/modules/order/state/get-upload-signature-action.ts's own
// auth check, just checking admin-tier role instead of "any signed-in
// user" since only staff should ever be able to attach a deliverable.
export async function getDeliverableUploadSignatureAction(projectId: string): Promise<UploadSignatureResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return { success: false, error: "File uploads aren't configured yet." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!isAdminTierRole(profile?.role)) {
    return { success: false, error: "Not authorized." };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `deliverables/${projectId}`;
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  return {
    success: true,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

export async function addProjectDeliverableAction(
  projectId: string,
  fileName: string,
  fileUrl: string,
): Promise<ProjectActionResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("project_files").insert({
    project_id: projectId,
    uploaded_by: user?.id ?? null,
    file_name: fileName,
    file_url: fileUrl,
    file_type: "deliverable",
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/projects");
  return { success: true };
}
