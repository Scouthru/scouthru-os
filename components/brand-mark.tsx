// The scouthru.com wordmark (public/wordmark.png, 1047x416, from the website's master
// artwork) used as a mask so it takes the text colour. Size it with a height class.
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Scouthru"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ aspectRatio: "1047 / 416", WebkitMask: "url(/wordmark.png) center / contain no-repeat", mask: "url(/wordmark.png) center / contain no-repeat" }}
    />
  );
}
