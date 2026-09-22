import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
    const cookieStore = await cookies();
    const locale = cookieStore.get("locale")?.value || "en";

    const validLocale =
        locale === "ms" || locale === "en" || locale === "zh-CN"
            ? locale
            : "en";

    return {
        locale: validLocale,
        messages: (await import(`../messages/${validLocale}.json`)).default,
    };
});