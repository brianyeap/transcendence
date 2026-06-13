"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Icon } from "@/app/components/duel/duel-icon";

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createSupabaseBrowserClient();

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error(Error);
            return;
        }

        router.push("/login");
    };

    return (
        <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-[7px] px-3 py-2.5 text-sm font-medium text-[#5d6877] transition hover:bg-[#f6485d]/15 hover:text-[#f6485d]"
        >
            <Icon name="logout" className="size-5" />
            Logout
        </button>
    )
}