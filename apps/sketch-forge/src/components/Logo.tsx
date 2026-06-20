import Image from "next/image";

/**
 * App logo. Renders the light- or dark-mode mark based on the active
 * `data-theme` (handled in CSS, so there is no hydration flash and no JS).
 */
export function Logo({
  size = 32,
  rounded = "rounded-lg",
  className = "",
}: {
  size?: number;
  rounded?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/app-logo-light.png"
        alt="Sketch Forge"
        width={size}
        height={size}
        priority
        className="logo-img logo-img--light block h-full w-full scale-[1.35] object-cover"
      />
      <Image
        src="/app-logo-dark.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority
        className="logo-img logo-img--dark block h-full w-full scale-[1.35] object-cover"
      />
    </span>
  );
}
