"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { MoreVertical } from "lucide-react"

export type ActionItem = {
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: () => void
}

type Props = {
  actions: ActionItem[]
}

export default function ActionMenu({ actions }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClick)
    }

    return () => {
      document.removeEventListener("mousedown", handleClick)
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-100"
      >
        <MoreVertical className="h-5 w-5 text-slate-700" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                setOpen(false)
                action.onClick()
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition ${
                action.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {action.icon && (
                <span className="flex h-5 w-5 items-center justify-center">
                  {action.icon}
                </span>
              )}

              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}