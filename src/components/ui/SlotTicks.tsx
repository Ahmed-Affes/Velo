"use client";

export function SlotTicks({
  occupied,
  capacity,
  size = "md",
  showText = true,
}: {
  occupied: number;
  capacity: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const safeCap = Math.max(1, capacity);
  const safeOcc = Math.max(0, Math.min(occupied, safeCap));
  const ratio = safeOcc / safeCap;

  const fillColor =
    safeOcc === 0
      ? "bg-[#C8553D]"
      : ratio >= 0.85
      ? "bg-[#F0A42B]"
      : "bg-[#0E5A6B]";

  const tickSize =
    size === "lg"
      ? "h-8 w-3.5"
      : size === "md"
      ? "h-5 w-2"
      : "h-3.5 w-1.5";

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex flex-wrap items-center gap-1"
        role="img"
        aria-label={`${safeOcc} vélos sur ${safeCap} emplacements`}
      >
        {Array.from({ length: safeCap }).map((_, idx) => {
          const isFilled = idx < safeOcc;
          return (
            <span
              key={idx}
              className={`${tickSize} rounded-[2px] border border-[#14232B] transition-colors ${
                isFilled ? fillColor : "bg-[#E3D9C6]/60"
              }`}
            />
          );
        })}
      </div>
      {showText && (
        <div className="flex items-center gap-2 text-xs font-mono-sfax text-[#14232B]/80">
          <span className="font-semibold text-[#14232B]">
            {safeOcc}/{safeCap}
          </span>
          <span>
            {safeOcc === 0
              ? "Station vide"
              : safeOcc === safeCap
              ? "Station pleine"
              : `${safeCap - safeOcc} places libres`}
          </span>
        </div>
      )}
    </div>
  );
}
