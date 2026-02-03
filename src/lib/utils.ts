import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prevents context menu (long-press) and other default behaviors on images
 * @param e - The event object (contextmenu or touchstart)
 */
export function preventImageContextMenu(e: Event) {
  e.preventDefault()
  return false
}
