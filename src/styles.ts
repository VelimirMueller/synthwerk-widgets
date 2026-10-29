// The widget styles live in its shadow root, so the host page and the widget never mix CSS.
// Constructable style sheets need no `style-src 'unsafe-inline'` (CSP-friendly).
import tokensCss from '@synthwerk/tokens/tokens.css?inline'
import uiCss from '@synthwerk/ui-vue/ui.css?inline'
import widgetCss from './styles/widget.css?inline'

/**
 * The tokens and ui-vue styles target `:root`. In a shadow root they must target the
 * widget root instead: `.sw-root` carries `data-theme`, `data-mode` and `data-service`.
 */
export function scopeToWidget(css: string): string {
  return css.replace(/:root\b/g, '.sw-root')
}

export const widgetStyles = `${scopeToWidget(tokensCss)}\n${scopeToWidget(uiCss)}\n${widgetCss}`

const sheets = new Map<string, CSSStyleSheet>()

/** Adds the styles to a shadow root: one shared constructable sheet, or a style element as fallback. */
export function applyStyles(root: ShadowRoot, css: string = widgetStyles): void {
  const canAdopt =
    'adoptedStyleSheets' in root &&
    typeof CSSStyleSheet === 'function' &&
    typeof CSSStyleSheet.prototype.replaceSync === 'function'
  if (!canAdopt) {
    const style = document.createElement('style')
    style.textContent = css
    root.append(style)
    return
  }
  let sheet = sheets.get(css)
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    sheets.set(css, sheet)
  }
  root.adoptedStyleSheets = [sheet]
}
