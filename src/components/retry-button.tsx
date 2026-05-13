'use client'

export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="mt-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
    >
      נסה שוב
    </button>
  )
}
