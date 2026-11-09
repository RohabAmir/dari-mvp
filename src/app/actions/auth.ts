"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { SYSTEM_USER_EMAIL } from "@/server/certificates";

export async function loginAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.email === SYSTEM_USER_EMAIL) redirect("/login?error=1");
  await createSession(user.id);
  redirect(user.role === "REVIEWER" ? "/review" : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function toggleLocale() {
  const store = await cookies();
  const next = store.get(LOCALE_COOKIE)?.value === "ar" ? "en" : "ar";
  store.set(LOCALE_COOKIE, next, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
