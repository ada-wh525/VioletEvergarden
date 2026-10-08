import type { CSSProperties } from "react";
import type { Volume } from "../../lib/novel";

/**
 * A closed envelope representing one volume. Pure markup + CSS; the parent
 * decides whether it is a link (shelf) or a decorative hero (volume sheet).
 * Layers, back to front: back · sheet peek · front pocket · flap (+seal) · markings.
 */
export function EnvelopeArt({ volume, open = false, style }: { volume: Volume; open?: boolean; style?: CSSProperties }) {
  return (
    <span className={`envelope tone-${volume.tone} ${open ? "is-open" : ""}`} style={style} aria-hidden="true">
      <span className="envelope-back" />
      <span className="envelope-sheet-peek"><b>{volume.title}</b><small>{volume.subtitle}</small></span>
      <span className="envelope-front" />
      <span className="envelope-flap"><span className="envelope-seal">V</span></span>
      <span className="envelope-stripe" />
      <span className="envelope-address">
        <b>{volume.title}</b>
        <small>{volume.subtitle}</small>
        <em>{volume.addressee}</em>
      </span>
      <span className="envelope-stamp">
        <b>{volume.numeral}</b>
        <small>C.H. POSTAL</small>
      </span>
      <span className="envelope-postmark">
        <span>{volume.published}</span>
        <em>LEIDEN</em>
      </span>
    </span>
  );
}
