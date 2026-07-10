import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hideWindow } from '@/lib/window';
import { isMac, CAPTION_BUTTON_WIDTH } from '@/lib/platform';

/**
 * The Windows/Linux caption close button.
 *
 * macOS renders nothing: this panel is summoned like Spotlight, and every
 * summoned panel on that platform dismisses with Escape or a click away rather
 * than a close control. Windows and Linux draw a chromeless window here, so a
 * caption button in the corner is what people reach for — styled as window
 * chrome (square, flush, red on hover) so it never reads as a second "clear the
 * search field" ✕ sitting next to the real one.
 *
 * It layers above the resize edges — otherwise the top 6px of the button would
 * start a resize instead of closing — but below the corner handles, so the
 * top-right corner still resizes.
 */
export function WindowControls() {
  const { t } = useTranslation();
  if (isMac()) return null;

  return (
    <button
      onClick={() => hideWindow()}
      aria-label={t('common.close')}
      title={t('common.close')}
      style={{ width: CAPTION_BUTTON_WIDTH }}
      className="fixed top-0 end-0 z-[10001] h-8 flex items-center justify-center rounded-se-lg no-drag cursor-pointer text-foreground/50 transition-colors duration-100 hover:bg-[#c42b1f] hover:text-white focus-visible:ring-2 focus-visible:ring-accent outline-none"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
