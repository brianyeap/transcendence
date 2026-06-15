'use client'

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
}

export function CreateMatchModal({ isOpen, onClose }: Props) {
    const router = useRouter()
    const backdropRef = useRef<HTMLDivElement>(null)
    const [duration, setDuration] = useState(120)
    const [capital, setCapital] = useState(10000)
    const [isCreating, setIsCreating] = useState(false)

    function handleClose() {
        setIsCreating(false)
        onClose()
    }

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
        return () => document.addEventListener('keydown', handleEscButton)
    }, [isOpen, onClose])

    // incomplete function to create the match room
    async function handleCreate() {
        setIsCreating(true)

        await new Promise((r) => setTimeout(r, 600))
        const mockRoomId = crypto.randomUUID()
        router.push(`/rooms/${mockRoomId}`)
    }

    if (!isOpen) return null

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
