import "server-only";
import { cookies } from "next/headers";
import { dictionaries, LOCALE_COOKIE, type Dict, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return v === "ar" ? "ar" : "en";
}

export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
