// This component needs to run on the client/browser
"use client";

import Link from "next/link";
import { Avatar } from "./avatar";
import { navItems } from "./data";
import { Icon } from "./duel-icon";
import { Logo } from "./logo";
import { LogoutButton } from "../auth/logout-button";
import { CreateMatchModal } from "./create-match-modal";
import { useState } from "react";
import { usePathname } from "next/navigation";

// children: React.ReactNode -> Tells that the children variable can contain something that React can render.
export function SideNav({ children, user = "you_degen" }: { children: React.ReactNode; user?: string })
{

	// Creates a state variable and a function to control wheather a pop-up window is
	// open or closed , starting with closed.
	const [modalOpen, setModalOpen] = useState(false)
	// Gets the current URL path, e.g. "/matches".
	// Used below to determine which nav item is active.
	const pathname = usePathname();

// ======================================== TO THIS POINT ==================================
// Create a React component called SideNav. It accepts some content to render inside it,
// and optionally a username. If no username is supplied, use you_degan. Maintain a piece
// of state called modalOpen, initially false, so we can control weather the match-creation
// window is displayed. Also get the current URL path so we can determine which navigation
// item is active.
// =========================================================================================
	
	// This component should render this UI. 
	/* 
	SideNav
	│
	├── Desktop Sidebar
	│   ├── Logo
	│   ├── New Match button
	│   ├── Create Match Modal
	│   ├── Navigation
	│   └── User section
	│
	├── Main Content
	│   └── children
	│
	└── Mobile Bottom Navigation
	*/
	return (
		<main className="flex min-h-screen bg-[#090b10] text-[#eef2f8]">
			<aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/[.07] bg-[#0f131b] px-3.5 py-4 lg:flex">
				<Link href="/" className="px-2 pb-5 pt-1 text-left">
					<Logo />
				</Link>
				{/* When this button is clicked, execute this function. */}
				<button onClick={() => setModalOpen(true)} className="mb-5 flex h-[42px] cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110">
					<Icon name="plus" className="size-4" />
					New Match
				</button>

				<CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)}/>

				<div className="px-2.5 pb-2 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">Menu</div>
				<nav className="flex flex-col gap-1">
				{/* Loop through navItems and create a Link for each item. */}
					{navItems.map((item) => (
						<Link
							key={item.label}
							href={item.page}

							// Ternary: if this is the current page, use active styles;
							// otherwise use inactive styles.
							className={`relative flex w-full cursor-pointer items-center gap-3 rounded-[7px] px-3 py-2.5 text-sm transition ${
								pathname === item.page ? "bg-[#151b25] font-semibold text-[#eef2f8]" : "font-medium text-[#5d6877] hover:bg-[#151b25] hover:text-[#9aa6b6]"
							}`}
						>
							{/* && = render this only when the condition is true.
							Shows the blue indicator beside the active page. */}
							{pathname === item.page && <span className="absolute -left-2.5 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-[#4d86ff]" />}
							<Icon name={item.icon} className={`size-5 ${pathname === item.page ? "text-[#4d86ff]" : ""}`} />
							{item.label}
						</Link>
					))}
				</nav>
				<div className="mt-auto">
					<div className="mx-1 my-3 h-px bg-white/[.07]" />
					<button className="flex w-full cursor-pointer items-center gap-3 rounded-[7px] px-2 py-2 text-left transition hover:bg-[#151b25]">
						<Avatar name={user} />
						<span className="min-w-0">
							<span className="block truncate text-sm font-semibold">{user}</span>
							<span className="block text-xs text-[#5d6877]">Diamond II</span>
						</span>
					</button>
					<LogoutButton />
				</div>
			</aside>

			<section className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">{children}</section>

			{/* ====================================================
				MOBILE BOTTOM NAVIGATION
				====================================================

				On large screens, the sidebar above is used.
				On smaller screens, the sidebar is hidden and this
				navigation bar appears fixed at the bottom. */}

			<nav className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] border-t border-white/[.07] bg-[#0f131b]/95 px-1.5 backdrop-blur lg:hidden">
				{navItems.map((item) => (
					<Link href={item.page} key={item.label} className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[10.5px] font-semibold ${pathname === item.page ? "text-[#4d86ff]" : "text-[#5d6877]"}`}>
						<Icon name={item.icon} className="size-5" />
						{item.label}
					</Link>
				))}
			</nav>
		</main>
	);
}
