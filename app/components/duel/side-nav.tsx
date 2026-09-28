// This component needs to run on the client/browser
"use client";

import Link from "next/link";
import { Avatar } from "./avatar";
import { navItems } from "./data";
import { Icon } from "./duel-icon";
import { Logo } from "./logo";
import { LogoutButton } from "../auth/logout-button";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOnlinePing } from "./use-online-ping";
import { useInviteToast } from "./use-invite-toast";

export function SideNav({ children, user }: { children: React.ReactNode; user?: string }) {
	const [fetchedName, setFetchedName] = useState("");
	const [fetchedAvatar, setFetchedAvatar] = useState<string | null>(null);
	const pathname = usePathname();
	const t = useTranslations("SideNav");

	// becasue this exist on evrey page so we always ping
	useOnlinePing();

	// friend invites pop up as a toast
	useInviteToast();

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		let cancelled = false;

		async function loadProfile() {
			const { data: { user: authUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
			if (!authUser) return;

			// We ALWAYS fetch this now, so we can get the avatar_url
			const { data: profile } = await supabase
				.from("profiles")
				.select("username, avatar_url")
				.eq("id", authUser.id)
				.maybeSingle();

			if (!cancelled) {
				// Use the DB username, or fall back to the prop, or "Trader"
				setFetchedName(profile?.username || user || "Trader");
				setFetchedAvatar(profile?.avatar_url || null);
			}
		}

		loadProfile();
		return () => { cancelled = true; };
	}, [user]);

	// Blank until the lookup finishes, so we never flash a fake name.
	const displayName = user ?? fetchedName;

	return (
		<main className="flex min-h-screen bg-[#090b10] text-[#eef2f8]">
			<aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/[.07] bg-[#0f131b] px-3.5 py-4 lg:flex lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
				<Link href="/" className="px-2 pb-5 pt-1 text-left">
					<Logo />
				</Link>

				{/* Section label above the links. Purely decorative. */}
				<div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-faint">
					{t("menu")}
				</div>

				<nav className="flex flex-col gap-1">
					{navItems.map((item) => {
						const isActive = pathname === item.page;

						return (
							<Link
								key={item.label}
								href={item.page}
								className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
									isActive ? "bg-raised text-ink" : "text-dim hover:bg-raised"
								}`}
							>
								{/* The blue bar on the left edge of the current page. */}
								{isActive ? (
									<span className="absolute -left-2 top-1/2 h-4.5 w-0.75 -translate-y-1/2 rounded-full bg-brand" />
								) : null}
								<Icon name={item.icon} className={`size-5 ${isActive ? "text-brand" : ""}`} />
								{t(item.label.toLowerCase())}
							</Link>
						);
					})}
				</nav>

				{/* mt-auto pushes this block to the bottom of the menu */}
				<div className="mt-auto">
					<div className="my-3 h-px bg-line" />
					<Link
						href="/profile"
						className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-raised"
					>
						<Avatar name={displayName} imageUrl={fetchedAvatar} />
						<span className="truncate text-sm font-semibold">{displayName}</span>
					</Link>
					<LogoutButton />

					{/* Legal pages, reachable from every page that has the menu. */}
					<div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-faint">
						<Link href="/privacy-policy" className="hover:text-ink hover:underline">
							{t("privacyPolicy")}
						</Link>
						<Link href="/terms-services" className="hover:text-ink hover:underline">
							{t("termsOfService")}
						</Link>
					</div>
				</div>
			</aside>

			<section className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</section>

			{/* ====================================================
				MOBILE BOTTOM NAVIGATION
				====================================================

				On large screens, the sidebar above is used.
				On smaller screens, the sidebar is hidden and this
				navigation bar appears fixed at the bottom. */}

			{/* There are 7 items, which is too many for labels on a phone: they would
				squeeze the icons. So the labels only appear from md upwards and below
				that the bar is just icons, spaced evenly with a slight gap. */}
			<nav className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] justify-around gap-1 border-t border-white/[.07] bg-[#0f131b]/95 px-1.5 backdrop-blur md:gap-2 lg:hidden">
				{navItems.map((item) => (
					<Link
						key={item.label}
						href={item.page}
						aria-label={t(item.label.toLowerCase())}
						className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold md:flex-none md:px-2 ${
							pathname === item.page ? "text-brand" : "text-dim"
						}`}
					>
						<Icon name={item.icon} className="size-5" />
						{/* Hidden on phones so the icons get the full width; from md up the
						    label sits under the icon exactly as before. */}
						<span className="hidden md:block">{t(item.label.toLowerCase())}</span>
					</Link>
				))}
			</nav>
		</main>
	);
}
