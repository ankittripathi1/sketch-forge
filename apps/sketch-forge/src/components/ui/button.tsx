import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "group/button inline-flex shrink=0 items-center justify-center shadow shadow-white",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-text border-2 border-",
        outline: "border-border",
      },
      size: {
        default: "h-10 px-2.5 gap-1.5",
        xs: "h-6 px-2 gap-1",
        sm: "h-7 px-2.5 gap-1",
        lg: "h-11 px-2.5 gap-1.5",
        icon: "size-8",
      },
    },
  },
);

export default function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
