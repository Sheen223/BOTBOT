import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bubbly font-bold uppercase tracking-wider transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-1 active:border-b-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white shadow-button-primary border-b-4 border-primary-dark hover:brightness-110",
        destructive:
          "bg-danger text-white shadow-button-danger border-b-4 border-danger-dark hover:brightness-110",
        secondary:
          "bg-secondary text-white shadow-button-secondary border-b-4 border-secondary-dark hover:brightness-110",
        success:
          "bg-success text-white shadow-button-success border-b-4 border-success-dark hover:brightness-110",
        ghost: "hover:bg-black/5 text-foreground active:translate-y-0 active:border-none",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0 active:border-none",
      },
      size: {
        default: "h-14 px-8 py-2 text-lg",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-16 rounded-3xl px-10 text-xl",
        icon: "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
