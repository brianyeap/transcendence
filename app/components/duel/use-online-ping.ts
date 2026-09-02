"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PING_EVERY_MS = 5000;

export function useOnlinePing() {
	useEffect(() => {
		const supabase = createSupabaseBrowserClient();

		async function ping() {
			await supabase.rpc("ping_online"); //call the ping_online function in supabase to update the last_online timestamp
		}

		ping();

		const timer = setInterval(() => {
			if (document.visibilityState === "hidden") return; // Don't ping when the user is on another tab
			ping();
		}, PING_EVERY_MS);

		document.addEventListener("visibilitychange", ping); // Ping when the user switches back to this tab

		//  Stop pinging when the page (or component) goes away, react auto calls this on cleanup
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", ping);
		};
	}, []);
}
