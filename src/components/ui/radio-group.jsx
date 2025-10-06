import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("grid gap-2", className)}
      role="radiogroup"
      {...props}
    />
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef(({ className, checked, ...props }, ref) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {checked && (
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
