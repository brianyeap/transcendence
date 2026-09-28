"use client";

import { useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Number of wins that unlocks an achievement -> its key in
// "profile.achievements" (messages/*.json). Same numbers as the profile page.
const WIN_ACHIEVEMENTS: Record<number, string> = {
  1: "first_1_win",
  5: "first_5_wins",
  10: "first_10_wins",
  42: "first_42_wins",
  100: "first_100_wins",
  500: "first_500_wins",
};

// Runs when a match ends. If the player just won and that win reached one of
// the numbers above, show "Achievement unlocked" with a link to the profile,
// where every achievement and its progress is listed.
export function useAchievementToast(won: boolean, viewerUserId: string) {
  const t = useTranslations("AchievementToast");
  const tProfile = useTranslations("profile");

  useEffect(() => {
    if (!won) return;

    // Count my wins. The engine saves the result before it tells us the
    // match ended, so this already includes the match that just finished.
    createSupabaseBrowserClient()
      .from("matches")
      .select("id", { count: "exact", head: true }) // only the count, no rows
      .eq("winner_user_id", viewerUserId)
      .eq("status", "completed")
      .then(({ count }) => {
        const key = count === null ? undefined : WIN_ACHIEVEMENTS[count];
        if (key === undefined) return; // no new achievement this time

        toast.success(
          (tt) => (
            <div className="flex flex-col gap-1">
              <span>{t("unlocked", { name: tProfile(`achievements.${key}.name`) })}</span>
              <Link
                href="/profile"
                onClick={() => toast.dismiss(tt.id)}
                className="text-sm font-semibold text-[#4d86ff] hover:underline"
              >
                {t("seeProgress")}
              </Link>
            </div>
          ),
          // A fixed id means the toast is never shown twice for one match.
          { id: "achievement-unlocked", duration: 8000 }
        );
      });
  }, [won, viewerUserId, t, tProfile]);
}
