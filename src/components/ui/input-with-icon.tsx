import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  iconPosition?: "left" | "right";
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, icon, iconPosition = "left", ...props }, ref) => {
    const iconPadding = iconPosition === "left" ? "pl-10" : "pr-10";
    
    return (
      <div className="relative">
        <span className={cn(
            "absolute inset-y-0 flex items-center text-muted-foreground",
            iconPosition === "left" ? "left-3" : "right-3"
        )}>
            {icon}
        </span>
        <Input
          className={cn(iconPadding, className)}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
InputWithIcon.displayName = "InputWithIcon"

export { InputWithIcon }
