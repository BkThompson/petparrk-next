'use client'
import { usePathname } from 'next/navigation'

export default function ConditionalShell({ nav, footer, children }) {
  const pathname = usePathname()
  const isUnlock = pathname === '/unlock'

  return (
    <>
      {!isUnlock && nav}
      {children}
      {!isUnlock && footer}
    </>
  )
}
