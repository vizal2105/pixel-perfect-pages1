import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        portal: "bg-primary text-primary-foreground hover:bg-primary/90",
        compact: "border border-input bg-secondary text-secondary-foreground hover:bg-accent",
        theme: "border border-primary/30 bg-secondary text-primary hover:bg-accent dark:text-admin",
        admin: "border border-admin/30 bg-admin/5 text-admin hover:bg-admin/10",
        auth: "bg-[var(--auth-action)] text-primary-foreground hover:opacity-90",
        eye: "text-muted-foreground hover:text-foreground",
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        nav: "h-6 rounded px-2.5 text-[10px] gap-1 [&_svg]:size-3",
        mini: "h-5 w-7 rounded [&_svg]:size-3",
        action: "h-[34px] px-5 text-xs [&_svg]:size-3.5",
        submit: "h-9 w-full text-xs mt-1.5",
        eye: "h-[35px] w-9 absolute right-0 top-0 [&_svg]:size-3.5",
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
