"use server";

import { headers } from "next/headers";
import { Slug } from "@/content/schemas";
import { submitEnquiry } from "@/lib/enquiry";
import { clientIp, contactLimiter } from "@/lib/ratelimit";
import { getPublished } from "@/lib/site";

export type EnquiryField = "name" | "email" | "company" | "message";
export type EnquiryState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: Partial<Record<EnquiryField, string>>;
  values?: Partial<Record<EnquiryField, string>>;
};

const FIELDS: EnquiryField[] = ["name", "email", "company", "message"];

export async function sendEnquiry(slug: string, _prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()])) as Record<
    EnquiryField,
    string
  >;
  // Honeypot: people never see the "website" field; bots fill it. Pretend success, store nothing.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent" };

  const validSlug = Slug.safeParse(slug);
  if (!validSlug.success) return { status: "error", message: "This page can't take enquiries." };

  const ip = clientIp(await headers());
  let result: Awaited<ReturnType<typeof submitEnquiry>>;
  try {
    result = await submitEnquiry(
      validSlug.data,
      { ...values, company: values.company || undefined },
      {
        getSite: getPublished,
        allow: async () => {
          try {
            return (await contactLimiter().limit(ip)).success;
          } catch (err) {
            // Fail open: a limiter outage must not block a genuine enquiry. Logged for follow-up.
            console.error("[enquiry] rate limiter unavailable:", err instanceof Error ? err.message : err);
            return true;
          }
        },
      },
    );
  } catch (err) {
    console.error("[enquiry] failed:", err instanceof Error ? err.message : err);
    return { status: "error", values, message: "Something went wrong sending your enquiry. Please use WhatsApp." };
  }

  if (result.ok) return { status: "sent" };
  if (result.reason === "INVALID") {
    return { status: "error", fieldErrors: result.fieldErrors, values, message: "Check the highlighted fields." };
  }
  if (result.reason === "RATE_LIMITED") {
    return {
      status: "error",
      values,
      message: "Too many enquiries from your connection. Try again in an hour or use WhatsApp.",
    };
  }
  return { status: "error", values, message: "This page can't take enquiries right now. Use WhatsApp instead." };
}
