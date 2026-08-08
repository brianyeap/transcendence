'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Room } from "./types";

// Every Match is one minute for now. Kept as a named constant so the fixed rule
// is obvious at the call site and easy to lift back into an option later.
const MATCH_DURATION_SECONDS = 60

const CAPITAL_OPTIONS = [
    { label: '5K', value: 5000 },
    { label: '10K', value: 10000 },
    { label: '20K', value: 20000 }
]

interface Props {
    isOpen: boolean
    onClose: () => void
    onCreated?: (room: Room) => void
}

export function CreateMatchModal({ isOpen, onClose, onCreated }: Props) {
    const router = useRouter() // used to send the creator into their new room
    const backdropRef = useRef<HTMLDivElement>(null)
    const [name, setName] = useState('') // optional: blank falls back to "<creator>'s Room"
    const [capital, setCapital] = useState(10000)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleClose = useCallback(() => {
        setIsCreating(false)
        setError(null)
        setName('') // start fresh next time the modal opens
        onClose()
    }, [onClose])

    // button click outside the modal closes it
    function handleBackdropClick(e: React.MouseEvent) {
        if (e.target == backdropRef.current)
            handleClose()
    }

    // ESC button closes modal
    useEffect(() => {
        function handleEscButton(e: KeyboardEvent) {
            if (e.key === 'Escape')
                handleClose()
        }
        if (isOpen)
            document.addEventListener('keydown', handleEscButton)
        return () => document.removeEventListener('keydown', handleEscButton)
    }, [isOpen, handleClose]) //dependencies: isOpen, handleClose

    async function handleCreate() {
        setIsCreating(true)
        setError(null)

        try {
            const response = await fetch("/api/rooms", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    startingCapital: capital,
                    durationSeconds: MATCH_DURATION_SECONDS,
                }),
            })
            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error ?? "Could not create room.")
            }

            if (onCreated) { // upsertRoom func
                onCreated(result.room)
            } else {
                window.dispatchEvent(new CustomEvent("room-created", { detail: result.room })) // broadcast the event to all listeners
            }

            handleClose()
            // The creator is player one — send them straight into their room to
            // wait for an opponent (this is where the match screen lives).
            router.push(`/matches/${result.room.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create room.")
            setIsCreating(false)
        }
    }

    if (!isOpen) return null // if modal is not open, return null to not render anything

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
            <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-white/[.07] bg-[#151b25] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#eef2f8]">Create Match</h2>
                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        className="grid size-7 place-items-center rounded-md text-[#5d6877] transition-colors hover:bg-white/[.06] hover:text-[#eef2f8]"
                    >✕</button>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="room-name" className="text-[13px] font-semibold text-[#9aa6b6]">Room Name</label>
                    <input
                        type="text" id="room-name" name="room-name" disabled={isCreating}
                        value={name} onChange={(e) => setName(e.target.value)} maxLength={40}
                        placeholder="eg: Chicken Rice"
                        className="rounded-lg border border-white/[.07] bg-[#0f131b] px-3 py-2 text-sm text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/50 disabled:opacity-50"
                    />
                </div>

                {/* Duration is fixed at one minute — shown, not chosen. */}
                <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#9aa6b6]">Match Length</span>
                    <div className="flex items-center justify-between rounded-lg border border-white/[.07] bg-[#0f131b] px-3 py-2.5">
                        <span className="text-sm font-semibold text-[#eef2f8]">1 min</span>
                        <span className="rounded-full bg-white/[.04] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[.04em] text-[#5d6877]">Fixed</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-semibold text-[#9aa6b6]">Starting Capital</span>
                    <div className="flex gap-2">
                        {CAPITAL_OPTIONS.map((opt) => {
                            const selected = capital === opt.value
                            return (
                                <button
                                    key={opt.value} onClick={() => setCapital(opt.value)} disabled={isCreating}
                                    className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                                        selected
                                            ? 'border-transparent bg-[#4d86ff] text-white'
                                            : 'border-white/[.07] bg-[#0f131b] text-[#9aa6b6] hover:border-white/[.12] hover:text-[#eef2f8]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {error ? (
                    <p className="rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 py-2 text-sm text-[#ff8c99]">
                        {error}
                    </p>
                ) : null}

                <div className="flex gap-2">
                    <button
                        onClick={handleClose}
                        className="flex-1 rounded-lg border border-white/[.07] bg-[#0f131b] py-2 text-sm font-semibold text-[#9aa6b6] transition-colors hover:border-white/[.12] hover:text-[#eef2f8]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate} disabled={isCreating}
                        className="flex-1 rounded-lg bg-[#4d86ff] py-2 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110 disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
