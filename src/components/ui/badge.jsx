import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Deliberately NOT a pill: a small rectangular tag with a colored left
// edge, closer to a tab on a paper file than a generic SaaS status pill.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border-l-2 rounded-sm px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-l-primary bg-secondary text-secondary-foreground",
        success: "border-l-success bg-success/10 text-success",
        warning: "border-l-warning bg-warning/10 text-warning",
        destructive: "border-l-destructive bg-destructive/10 text-destructive",
        accent: "border-l-accent bg-accent/10 text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
