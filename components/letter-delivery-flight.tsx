export type LetterDeliveryState = "idle" | "sending" | "delivered";

export function LetterDeliveryFlight({
  state,
  deliveredTitle = "心意已经送达",
  deliveredLabel = "DELIVERED WITH LOVE",
}: {
  state: LetterDeliveryState;
  deliveredTitle?: string;
  deliveredLabel?: string;
}) {
  if (state === "idle") return null;

  return (
    <div className={`delivery-flight ${state}`} role="status" aria-live="polite">
      <div className="flight-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="flight-envelope" aria-hidden="true"><span /><i>V</i></div>
      <p>
        <strong>{state === "sending" ? "信件正在启程" : deliveredTitle}</strong>
        <span>{state === "sending" ? "DELIVERING YOUR LETTER" : deliveredLabel}</span>
      </p>
    </div>
  );
}
