import * as React from "react"
import { cn } from "@/lib/utils" // Atau gunakan className langsung jika tidak pakai helper

export function Pagination({ children }: { children: React.ReactNode }) {
  return <nav className="flex justify-center mt-4">{children}</nav>
}

export function PaginationContent({ children }: { children: React.ReactNode }) {
  return <ul className="flex items-center gap-1">{children}</ul>
}

export function PaginationItem({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

interface PaginationLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
}

export function PaginationLink({ isActive, className, children, ...props }: PaginationLinkProps) {
  return (
    <button
      className={cn(
        "px-3 py-1 rounded border text-sm",
        isActive ? "bg-blue-600 text-white" : "hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function PaginationEllipsis() {
  return <span className="px-2 text-sm text-gray-500 select-none">…</span>
}

export function PaginationPrevious({ onClick }: { onClick?: () => void }) {
  return (
    <PaginationItem>
      <PaginationLink onClick={onClick}>Previous</PaginationLink>
    </PaginationItem>
  )
}

export function PaginationNext({ onClick }: { onClick?: () => void }) {
  return (
    <PaginationItem>
      <PaginationLink onClick={onClick}>Next</PaginationLink>
    </PaginationItem>
  )
}
