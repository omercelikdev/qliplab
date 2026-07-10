/**
 * Visual masking for sensitive clips.
 *
 * `isSensitive` used to gate nothing but AI actions, so a copied JWT, API key
 * or password rendered in full in the history list — readable over someone's
 * shoulder or in a screen share. Blur it until the row is hovered: pasting
 * never requires reading the value.
 */

/** Whether a row's content should be visually obscured right now. */
export function shouldMaskContent(
  isSensitive: boolean,
  detectionEnabled: boolean,
  isHovered: boolean,
): boolean {
  if (!detectionEnabled) return false;
  if (!isSensitive) return false;
  return !isHovered;
}
