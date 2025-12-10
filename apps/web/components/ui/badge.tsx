import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Kitchen status variants
        new: "border-transparent bg-kitchen-new text-white",
        cooking: "border-transparent bg-kitchen-cooking text-black",
        ready: "border-transparent bg-kitchen-ready text-white",
        late: "border-transparent bg-kitchen-late text-white animate-flash",
        // Order item status
        pending: "border-transparent bg-gray-200 text-gray-800",
        held: "border-transparent bg-yellow-100 text-yellow-800 border-yellow-300",
        fired: "border-transparent bg-blue-100 text-blue-800",
        served: "border-transparent bg-green-100 text-green-800",
        void: "border-transparent bg-red-100 text-red-800 line-through",
        // 86'd
        "eighty-six":
          "border-transparent bg-red-500 text-white font-bold uppercase",
        // Success/Warning variants
        success: "border-transparent bg-green-500 text-white",
        warning: "border-transparent bg-yellow-500 text-black",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
