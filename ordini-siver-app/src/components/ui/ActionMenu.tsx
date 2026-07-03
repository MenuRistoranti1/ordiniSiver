"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
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
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  function calcolaPosizione() {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 230
    const menuHeight = 230
    const spazioSotto = window.innerHeight - rect.bottom
    const apreSopra = spazioSotto < menuHeight

    setPosition({
      top: apreSopra ? rect.top - menuHeight - 8 : rect.bottom + 8,
      left: Math.max(12, rect.right - menuWidth),
    })
  }

  function toggleMenu() {
    if (!open) {
      calcolaPosizione()
    }

    setOpen((value) => !value)
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }

      setOpen(false)
    }

    function handleClose() {
      setOpen(false)
    }

    if (open) {
      document.addEventListener("mousedown", handleClick)
      window.addEventListener("scroll", handleClose, true)
      window.addEventListener("resize", handleClose)
    }

    return () => {
      document.removeEventListener("mousedown", handleClick)
      window.removeEventListener("scroll", handleClose, true)
      window.removeEventListener("resize", handleClose)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-100"
      >
        <MoreVertical className="h-5 w-5 text-slate-700" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[99999] w-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            style={{
              top: position.top,
              left: position.left,
            }}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
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
          </div>,
          document.body
        )}
    </>
  )
}