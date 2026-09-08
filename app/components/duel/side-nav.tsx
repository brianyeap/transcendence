"use client";

import Link from "next/link";
import { Avatar } from "./avatar";
import { navItems } from "./data";
import { Icon } from "./duel-icon";
import { Logo } from "./logo";
import { LogoutButton } from "../auth/logout-button";
import { CreateMatchModal } from "./create-match-modal";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useOnlinePing } from "./use-online-ping";

export function SideNav({ children, user }: { children: React.ReactNode; user?: string }) {
	const [modalOpen, setModalOpen] = useState(false);
	const [fetchedName, setFetchedName] = useState("");
	const pathname = usePathname();

	// becasue this exist on evrey page so we always ping
	useOnlinePing();

	useEffect(() => {
		if (user) return;

		const supabase = createSupabaseBrowserClient();
		let cancelled = false;

		async function loadName() {
			const { data: { user: authUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } })); // catch results ot null
			if (!authUser) return;

			const { data: profile } = await supabase
				.from("profiles")
				.select("username") // i only need username
				.eq("id", authUser.id)
				.maybeSingle();  // null or data

			const name =
				profile?.username || "Trader";

			//  The component may have unmounted while we were waiting.
			if (!cancelled) setFetchedName(name);
		}

		loadName();
		return () => { cancelled = true; };
	}, [user]);

	//  Blank until the lookup finishes, so we never flash a fake name.
	const displayName = user ?? fetchedName;

	return (
		<main className="flex min-h-screen bg-base text-ink">
			<aside className="hidden w-58 shrink-0 flex-col border-r border-line bg-panel px-3 py-4 lg:flex">
				<CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

				<nav className="flex flex-col gap-1">
					{navItems.map((item) => {
						const isActive = pathname === item.page;

						return (
							<Link
								key={item.label}
								href={item.page}
								className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
									isActive ? "bg-raised text-ink" : "text-dim hover:bg-raised"
								}`}
							>
								<Icon name={item.icon} className={`size-5 ${isActive ? "text-brand" : ""}`} />
								{item.label}
							</Link>
						);
					})}
				</nav>

				{/* mt-auto pushes this block to the bottom of the menu */}
				<div className="mt-auto">
					<div className="my-3 h-px bg-line" />
					<div className="flex items-center gap-3 px-2 py-2">
						<Avatar name={displayName} />
						<span className="truncate text-sm font-semibold">{displayName}</span>
					</div>
					<LogoutButton />
				</div>
			</aside>

			<section className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</section>

			{/* On a small screen the menu becomes a bar along the bottom instead. */}
			<nav className="fixed inset-x-0 bottom-0 flex h-16 border-t border-line bg-panel lg:hidden">
				{navItems.map((item) => (
					<Link
						key={item.label}
						href={item.page}
						className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${
							pathname === item.page ? "text-brand" : "text-dim"
						}`}
					>
						<Icon name={item.icon} className="size-5" />
						{item.label}
					</Link>
				))}
			</nav>
		</main>
	);
}
