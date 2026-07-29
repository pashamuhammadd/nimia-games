"use server";

import { Resend } from "resend";
import { ContactMessageEmail } from "@nimia/email";
import { contactFormSchema, type ContactFormValues } from "@nimia/validators";

export type SendContactMessageResult = { success: true } | { success: false; error: string };

// First place in the codebase that actually calls Resend's send() (29 Juli
// 2026) — everything before this (OrderReceivedEmail, ConfirmSignupEmail)
// was template-only or sent by Supabase Auth itself. RESEND_API_KEY /
// RESEND_FROM_EMAIL already existed in .env.example from earlier setup
// work but were unused until now.
//
// Instantiated inside the action (not at module scope) so a missing env
// var surfaces as a normal returned error instead of crashing the whole
// route at import time if it's ever absent in a given environment.
export async function sendContactMessageAction(
  values: ContactFormValues,
): Promise<SendContactMessageResult> {
  const parsed = contactFormSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return {
      success: false,
      error: "Contact form isn't configured yet. Please email us directly for now.",
    };
  }

  const { name, email, message } = parsed.data;
  const submittedAt = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });

  const resend = new Resend(apiKey);
  // Destination inbox: same contact address the public footer/email
  // templates already point to (see CONTACT_EMAIL in
  // packages/email/src/components/EmailLayout.tsx) — reusing it here
  // keeps there being exactly one "where do contact messages land"
  // answer instead of two addresses to keep in sync.
  const { error } = await resend.emails.send({
    from: `Nimia Studio Contact Form <${fromEmail}>`,
    to: "contact@nimiagames.com",
    replyTo: email,
    subject: `New contact message from ${name}`,
    react: ContactMessageEmail({ name, email, message, submittedAt }),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
