'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import type { Room } from "./types";

const DURATION_OPTIONS = [
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 }
]

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
    const backdropRef = useRef<HTMLDivElement>(null)
    const [duration, setDuration] = useState(120)
    const [capital, setCapital] = useState(10000)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleClose = useCallback(() => {
        setIsCreating(false)
        setError(null)
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
                    startingCapital: capital,
                    durationSeconds: duration,
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
            <div className="flex flex-col gap-4 bg-[#151b25] border border-white/[.07] rounded-xl p-6 w-full max-w-sm shadow-2x1">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Create Match</h2>
                    <button onClick={handleClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >✕</button>
                </div>
                <div className="flex flex-col">
                    <label htmlFor="room-name" className="text-[#9aa6b6]">Room Name</label>
                    <input type='text' id='room-name' name="room-name" disabled={isCreating}
                        className="border border-white/[.4] py-2 px-2 rounded-lg disabled:opacity-50" placeholder="eg: Chicken Rice"></input>
                </div>
                <div>
                    <h2 className="text-[#9aa6b6]">Match Duration</h2>
                    <div className="flex gap-2">
                        {DURATION_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => setDuration(opt.value)} disabled={isCreating}
                                className={`flex-1 py-1 rounded-lg font-semibold text-sm border border-white/[.4] transition-colors disabled:opacity-50
                                    ${duration === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h2 className="text-[#9aa6b6]">Starting Capital</h2>
                    <div className='flex gap-2'>
                        {CAPITAL_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => setCapital(opt.value)} disabled={isCreating}
                                className={`flex-1 py-1 rounded-lg font-semibold text-sm border border-white/[.4] transition-colors disabled:opacity-50
                                    ${capital === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {opt.value}
                            </button>
                        ))}
                    </div>
                </div>
                {error ? (
                    <p className="rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 py-2 text-sm text-[#ff8c99]">
                        {error}
                    </p>
                ) : null}
                <div className="flex gap-2">
                    <button onClick={handleClose}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-white/[.1] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button onClick={handleCreate} disabled={isCreating}
                        className="flex-1 py-2 bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                    >
                        {isCreating ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
