"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RoomCard } from "./room-card";
import { Icon } from "./duel-icon";
import { Button } from "./button";
import type { Room } from "./types";
import { CreateMatchModal } from "./create-match-modal";
import { useTranslations } from "next-intl";

//  A match you are already in. /api/rooms sends this back so the lobby can
//  offer a way in — a match in countdown or active is NOT in the open-rooms
//  list, so without this you would be locked out of your own game.
type ActiveMatch = {
  id: string;
  name: string;
  status: string;
  opponent: string;
  endsAt: string | null;
};

const PAGE_SIZE = 6;
const AUTO_REFRESH_MS = 3000;

export function LobbyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [deletingRoomIds, setDeletingRoomIds] = useState<string[]>([]);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  // Whether the current user owns an open room ANYWHERE in the list, not just
  // on the visible page. Comes from the server because we only hold one page.
  const [hasOwnRoom, setHasOwnRoom] = useState(false);

  // Page-jump input state
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [inputPage, setInputPage] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);

  const t = useTranslations("Lobby");
  const tErrors = useTranslations("RoomErrors");

  // Cache to avoid re-fetching pages already seen within the same session.
  // Cleared on every manual refresh so data stays fresh.
  const pageCacheRef = useRef<Record<number, Room[]>>({});
  const fetchingPageRef = useRef<number | null>(null);
  // Incremented on every load. A response whose id is no longer current is
  // stale (a newer load started after it) and is ignored.
  const requestIdRef = useRef(0);

  const totalPages = totalCount !== null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
  const hasNextPage = totalCount !== null ? (page + 1) * PAGE_SIZE < totalCount : openRooms.length === PAGE_SIZE;

  // ---- Data fetching -------------------------------------------------------

  //  quiet means no spinner and no error toasts (used by the auto-refresh)
  const loadPage = useCallback(async (targetPage: number, bustCache = false, quiet = false) => {
    // Serve from cache if available (and not busting).
    if (!bustCache && pageCacheRef.current[targetPage]) {
      // Invalidate any in-flight request so it can't overwrite this page.
      requestIdRef.current++;
      fetchingPageRef.current = null;
      setPageLoading(false);
      setOpenRooms(pageCacheRef.current[targetPage]);
      setPage(targetPage);
      return;
    }

    // Guard against concurrent fetches. Cache-busting reloads (refresh,
    // delete) are allowed through and supersede whatever is in flight.
    if (!bustCache && fetchingPageRef.current !== null) return;

    const requestId = ++requestIdRef.current;

    // A quiet load doesn't block the page buttons: if you click one while it
    // runs, your click wins and this response is dropped as stale.
    if (!quiet) {
      fetchingPageRef.current = targetPage;

      if (targetPage === 0 && !bustCache) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }
    }

    try {
      const response = await fetch(
        `/api/rooms?page=${targetPage}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" }
      );
      const result = await response.json();

      if (requestId !== requestIdRef.current) return; // stale response

      if (!response.ok) {
        if (!quiet) toast.error(result.error ?? tErrors("couldNotLoad"));
        return;
      }

      if (result.totalCount !== undefined) {
        setTotalCount(result.totalCount);
      }
      if (result.hasOwnRoom !== undefined) {
        setHasOwnRoom(Boolean(result.hasOwnRoom));
      }
      if (result.activeMatch !== undefined) {
        setActiveMatch(result.activeMatch ?? null);
      }

      pageCacheRef.current[targetPage] = result.rooms ?? [];
      setOpenRooms(result.rooms ?? []);
      setPage(targetPage);
    } catch {
      if (requestId === requestIdRef.current && !quiet) {
        toast.error(tErrors("couldNotLoad"));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setPageLoading(false);
        fetchingPageRef.current = null;
      }
    }
  }, [tErrors]);

  // Manual refresh: wipe cache and go back to page 0.
  const refresh = useCallback(() => {
    pageCacheRef.current = {};
    setIsEditingPage(false);
    setPageError(null);
    loadPage(0, true);
  }, [loadPage]);

  const handleNextPage = () => {
    if (pageLoading || fetchingPageRef.current !== null || !hasNextPage) return;
    setIsEditingPage(false);
    setPageError(null);
    loadPage(page + 1);
  };

  const handlePrevPage = () => {
    if (pageLoading || fetchingPageRef.current !== null || page <= 0) return;
    setIsEditingPage(false);
    setPageError(null);
    loadPage(page - 1);
  };

  const handleJumpToPage = () => {
    if (pageLoading || fetchingPageRef.current !== null) return;

    const trimmed = inputPage.trim();
    const num = Number(trimmed);
    if (!trimmed || !/^\d+$/.test(trimmed) || !Number.isInteger(num) || num < 1 || num > totalPages) {
      setPageError(
        totalPages > 1
          ? t("invalidPageRange", { totalPages })
          : t("invalidPageSingle")
      );
      return;
    }

    setPageError(null);
    setIsEditingPage(false);

    const targetPageIndex = num - 1;
    if (targetPageIndex !== page) {
      loadPage(targetPageIndex);
    }
  };

  useEffect(() => {
    loadPage(0);
  }, [loadPage]);

  //  Auto-refresh: quietly re-fetch the page you're looking at every few
  //  seconds (and when you come back to the tab) so new rooms just show up.
  useEffect(() => {
    function poll() {
      if (document.visibilityState === "hidden") return;
      if (fetchingPageRef.current !== null) return; // a normal load is running
      pageCacheRef.current = {}; // the other cached pages may be out of date too
      loadPage(page, true, true);
    }

    const timer = setInterval(poll, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", poll);

    return () => {  // cleanup when the lobby is closed or the page changes
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [loadPage, page]);

  // ---- Mutations -----------------------------------------------------------

  const deleteRoom = useCallback(async (room: Room) => {
    if (!room.ownedByCurrentUser) return;

    setDeletingRoomIds((roomIds) => [...roomIds, room.id]);

    try {
      const response = await fetch("/api/rooms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? tErrors("couldNotDelete"));
        return;
      }

      // Wipe cache and reload. If we just removed the last room on the last
      // page, step back one page instead of landing on an empty one.
      const newTotal = Math.max(0, (totalCount ?? 1) - 1);
      const lastPage = Math.max(0, Math.ceil(newTotal / PAGE_SIZE) - 1);
      pageCacheRef.current = {};
      setTotalCount(newTotal);
      setHasOwnRoom(false); // you can only own one room, and it's gone
      setIsEditingPage(false);
      setPageError(null);
      loadPage(Math.min(page, lastPage), true);
    } catch {
      toast.error(tErrors("couldNotDelete"));
    } finally {
      setDeletingRoomIds((roomIds) => roomIds.filter((roomId) => roomId !== room.id));
    }
  }, [tErrors, page, totalCount, loadPage]);

  //  Join someone else's room: tell the server, then go to the match page.
  const joinRoom = useCallback(async (room: Room) => {
    setJoiningRoomId(room.id);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? tErrors("couldNotJoin"));
        setJoiningRoomId(null);
        return;
      }

      router.push(`/matches/${result.roomId}`);
    } catch {
      toast.error(tErrors("couldNotJoin"));
      setJoiningRoomId(null);
    }
  }, [router, tErrors]);

  //  Go back into a room you created and left. No API call needed — you are
  //  already player one, so we just open the match page again.
  const enterOwnRoom = useCallback((room: Room) => {
    router.push(`/matches/${room.id}`);
  }, [router]);

  // ---- Render --------------------------------------------------------------

  if (loading) {
    return (
      <>
        <header className="flex items-center gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted">{t("subtitle")}</p>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted animate-pulse">
          {t("loading")}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Page header: title on the left, refresh and create on the right */}
      <header className="mx-auto flex w-full min-w-0 max-w-6xl items-center gap-4 border-b border-line px-4 pb-4 pt-4 md:px-7 md:pb-4 md:pt-8">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-dim">{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        <Button variant="quiet" onClick={refresh} disabled={pageLoading}>
          <Icon name="refresh" className={`size-4 ${pageLoading ? "animate-spin" : ""}`} />
        </Button>

        <Button
          onClick={() => setModalOpen(true)}
          disabled={hasOwnRoom}
          title={hasOwnRoom ? t("tooltipLimit") : undefined}
        >
          <Icon name="plus" className="size-4" />
          {t("createRoom")}
        </Button>
      </header>

      <CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-y-auto px-4 pb-4 pt-6 md:px-7 md:pb-8 md:pt-8">
        {/* Your game in progress. Shown above the list so it is the first thing
            you see when you come back to the lobby mid-match. */}
        {activeMatch ? (
          <div className="mb-6 flex items-center gap-4 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {activeMatch.status === "countdown"
                  ? t("matchStarting")
                  : t("matchLive")}
              </p>
              <p className="truncate text-xs text-muted">
                {activeMatch.name} · {t("vs")} {activeMatch.opponent}
              </p>
            </div>

            <Button onClick={() => router.push(`/matches/${activeMatch.id}`)}>
              {t("rejoin")}
            </Button>
          </div>
        ) : null}

        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dim">
          <Icon name="users" className="size-4" />
          {t("openGames")} {totalCount !== null ? `(${totalCount})` : ""}
        </h2>

        <div className={`grid gap-4 xl:grid-cols-2 transition-opacity duration-150 ${pageLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
          {openRooms.length === 0 ? (
            <p className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-muted">
              {t("noOpenRooms")}
            </p>
          ) : null}

          {openRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              deleting={deletingRoomIds.includes(room.id)}
              joining={joiningRoomId === room.id}
              onDelete={deleteRoom}
              onJoin={joinRoom}
              onEnter={enterOwnRoom}
            />
          ))}
        </div>

        {/* Pagination controls — only shown when there is more than one page */}
        {(totalCount !== null ? totalCount > PAGE_SIZE : openRooms.length === PAGE_SIZE) && (
          <div className="mt-6 pt-4 border-t border-line">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">
                {totalCount !== null
                  ? t("pageOf", { page: page + 1, total: totalPages })
                  : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="lobby-prev-page"
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page === 0 || pageLoading}
                  aria-label={t("previousPage")}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-line bg-panel text-sm hover:border-white/20 hover:bg-white/[.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {isEditingPage ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJumpToPage();
                    }}
                    className="inline-flex items-center gap-1.5"
                  >
                    <input
                      id="lobby-page-input"
                      type="text"
                      inputMode="numeric"
                      value={inputPage}
                      onChange={(e) => {
                        setInputPage(e.target.value);
                        if (pageError) setPageError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setIsEditingPage(false);
                          setPageError(null);
                        }
                      }}
                      autoFocus
                      aria-invalid={pageError ? true : undefined}
                      className={`w-12 h-8 px-1.5 text-center text-xs font-mono bg-panel border rounded-md outline-none transition-colors ${pageError
                        ? "border-rose-500 focus:border-rose-400"
                        : "border-white/[.15] focus:border-brand"
                        }`}
                    />
                    <span className="text-xs font-mono text-muted">/ {totalPages}</span>
                    <button
                      id="lobby-page-submit"
                      type="submit"
                      disabled={pageLoading}
                      className="px-2 py-1 text-xs font-medium rounded-md bg-brand/20 text-brand border border-brand/30 hover:bg-brand/30 transition-colors disabled:opacity-40"
                    >
                      {t("go")}
                    </button>
                  </form>
                ) : (
                  <button
                    id="lobby-current-page-btn"
                    type="button"
                    onClick={() => {
                      setIsEditingPage(true);
                      setInputPage(String(page + 1));
                      setPageError(null);
                    }}
                    title={t("jumpToPage")}
                    className="text-xs font-mono text-muted hover:text-white px-2 py-1 rounded-md hover:bg-white/[.04] border border-transparent hover:border-line transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="font-semibold underline decoration-dotted underline-offset-4 decoration-white/30 hover:decoration-white">
                      {page + 1}
                    </span>
                    <span>/</span>
                    <span>{totalPages}</span>
                  </button>
                )}

                <button
                  id="lobby-next-page"
                  type="button"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || pageLoading}
                  aria-label={t("nextPage")}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-line bg-panel text-sm hover:border-white/20 hover:bg-white/[.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {pageError && (
              <div id="lobby-page-error" role="alert" className="text-right text-xs text-rose-400 mt-2 font-medium">
                {pageError}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}