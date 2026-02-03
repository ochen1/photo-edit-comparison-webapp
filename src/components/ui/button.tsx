import { cva, type VariantProps } from "class-variance-authority"
import type { JSX } from "preact"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-gray-100 active:bg-gray-200",
        outline: "border-2 border-white/50 bg-transparent text-white hover:bg-white/10 active:bg-white/20",
        ghost: "bg-transparent text-white hover:bg-white/10 active:bg-white/20",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof buttonVariants> {
  disabled?: boolean
}

export function Button({ class: className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      class={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
