import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary))] bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_20px_hsl(var(--destructive))]",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_20px_hsl(var(--secondary))]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
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
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        <span className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-10 group-active:opacity-20 transition-opacity duration-300"></span>
        <span className="absolute inset-0 scale-0 rounded-full bg-white/30 opacity-0 group-active:scale-100 group-active:opacity-100 transition-transform duration-500 ease-out"></span>

      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
