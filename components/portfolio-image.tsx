import Image from "next/image";
import type { CSSProperties } from "react";

type PortfolioImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
};

export function PortfolioImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  style,
  priority = false,
}: PortfolioImageProps) {
  const isLocalMedia = src.startsWith("/") && !src.startsWith("//");

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={className}
      style={style}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized={!isLocalMedia}
    />
  );
}
