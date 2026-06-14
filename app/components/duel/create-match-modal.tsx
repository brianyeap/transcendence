'use client'

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
    const backdropRef = useRef<HTMLDivElement>(null)
    const [duration, setDuration] = useState(120)
    const [capital, setCapital] = useState(10000)
    const [isCreating, setIsCreating] = useState(false)

    // button click outside the modal closes it
    function handleBackdropClick(e: React.MouseEvent) {
        if (e.target == backdropRef.current)
            onClose()
    }

    // ESC button closes modal
    useEffect(() => {
        function handleEscButton(e: KeyboardEvent) {
            if (e.key === 'Escape')
                onClose();
        }
        if (isOpen) 
            document.addEventListener('keydown', handleEscButton)
        return () => document.addEventListener('keydown', handleEscButton)
    }, [isOpen, onClose])

    // incomplete function to create the match room
    function handleCreate() {
        setIsCreating(true)
    }

    if (!isOpen) return null

    return (
        <div 
            ref={backdropRef} 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
            <div className="flex flex-col gap-4 bg-gray-900 border border-gray-800 rounded-x1 p-6 w-full max-w-sm shadow-2x1">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Create Match</h2>
                    <button onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >✕</button>
                </div>
                <div className="flex flex-col">
                    <label htmlFor="room-name">Room Name</label>
                    <input type='text' id='room-name' name="room-name"
                        className="border border-gray-600 py-2 px-2 rounded-lg" placeholder="eg: Chicken Rice"></input>
                </div>
                <div>
                    <h2>Match Duration</h2>
                    <div className="flex gap-2">
                        {DURATION_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => setDuration(opt.value)}
                                className={`flex-1 py-1 rounded-lg font-semibold text-sm border transition-colors 
                                    ${duration === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {opt.value}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h2>Starting Capital</h2>
                    <div className='flex gap-2'>
                        {CAPITAL_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => setCapital(opt.value)}
                                className={`flex-1 py-1 rounded-lg font-semibold text-sm border transition-colors
                                    ${capital === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
                            >
                                {opt.value}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={handleCreate} disabled={isCreating}
                    className="w-full py-2 bg-blue-600 font-semibold text-white hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
                >
                    {isCreating ? 'Creating...' : 'Create'}
                </button>
            </div>
        </div>
    );
}