"use client";

import {
  ReactNode,
  ButtonHTMLAttributes,
  forwardRef,
  isValidElement,
  cloneElement,
} from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  appName?: string;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "default",
      size = "default",
      appName,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] dark:active:shadow-[2px_2px_0_0_#fff]";

    // On hover the face lifts -3px while the shadow stretches +3px downward,
    // so the visible gap doubles — the face appears to rise off the page.
    const resolvedVariantClasses = {
      default:
        "bg-accent border-2 border-black dark:border-white text-white shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] hover:bg-accent-hover hover:-translate-y-[3px] hover:shadow-[6px_9px_0_0_#000] dark:hover:shadow-[6px_9px_0_0_#fff]",
      outline:
        "border-2 border-black dark:border-white bg-transparent text-text-primary shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] hover:bg-surface-hover hover:-translate-y-[3px] hover:shadow-[6px_9px_0_0_#000] dark:hover:shadow-[6px_9px_0_0_#fff]",
      ghost: "hover:bg-surface-hover hover:text-text-primary",
      secondary:
        "bg-surface-raised border-2 border-black dark:border-white text-text-primary shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#fff] hover:bg-surface-hover hover:-translate-y-[3px] hover:shadow-[6px_9px_0_0_#000] dark:hover:shadow-[6px_9px_0_0_#fff]",
    };

    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3 text-xs",
      lg: "h-11 px-8",
      icon: "h-10 w-10",
    };

    const classes = [
      baseClasses,
      resolvedVariantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const onClickHandler = appName
      ? () => alert(`Hello from your ${appName} app!`)
      : props.onClick;

    if (
      asChild &&
      isValidElement<{
        className?: string;
        onClick?: React.MouseEventHandler<HTMLButtonElement>;
      }>(children)
    ) {
      return cloneElement(children, {
        className: [classes, children.props.className]
          .filter(Boolean)
          .join(" "),
        ref: ref as any,
        ...props,
        onClick: onClickHandler || children.props.onClick,
      } as any);
    }

    return (
      <button ref={ref} className={classes} onClick={onClickHandler} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
