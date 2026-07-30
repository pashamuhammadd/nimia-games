// Same status metadata as apps/studio/app/lib/projectStatus.ts, kept in
// sync so admin and client always agree on what each project_status enum
// value (packages/db/migrations/0001_enums_and_users.sql) is called and
// colored as. Only the activity label mapping is used on the admin
// Overview page today; the rest is here so /projects can adopt it directly
// once that section moves past "Coming Soon".

export type ProjectStatus =
  | "pending_review"
  | "quotation"
  | "waiting_payment"
  | "paid"
  | "planning"
  | "in_progress"
  | "revision"
  | "final_review"
  | "completed"
  | "cancelled";

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; dotClass: string }> = {
  pending_review: { label: "Pending Review", dotClass: "bg-slate-400" },
  quotation: { label: "Quotation", dotClass: "bg-sky-400" },
  waiting_payment: { label: "Pending Payment", dotClass: "bg-purple-400" },
  paid: { label: "Paid", dotClass: "bg-emerald-400" },
  planning: { label: "Planning", dotClass: "bg-sky-400" },
  in_progress: { label: "In Production", dotClass: "bg-emerald-400" },
  revision: { label: "Review Stage", dotClass: "bg-amber-400" },
  final_review: { label: "Final Review", dotClass: "bg-amber-400" },
  completed: { label: "Completed", dotClass: "bg-emerald-500" },
  cancelled: { label: "Cancelled", dotClass: "bg-red-400" },
};

export function projectStatusMeta(status: string) {
  return (
    PROJECT_STATUS_META[status as ProjectStatus] ?? {
      label: status,
      dotClass: "bg-slate-400",
    }
  );
}

export const PROJECT_ACTIVITY_LABEL: Record<ProjectStatus, string> = {
  pending_review: "Order Created",
  quotation: "Quotation Sent",
  waiting_payment: "Invoice Generated",
  paid: "Payment Confirmed",
  planning: "Planning Started",
  in_progress: "Production Started",
  revision: "Revision Requested",
  final_review: "Final Review Started",
  completed: "Project Completed",
  cancelled: "Project Cancelled",
};

export function projectActivityLabel(status: string) {
  return PROJECT_ACTIVITY_LABEL[status as ProjectStatus] ?? "Project Updated";
}
