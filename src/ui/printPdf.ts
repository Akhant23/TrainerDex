const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * Print a PDF itself (crisp vector text, its own page size) from a hidden frame. iOS can't print
 * a framed PDF, so there it opens in a tab, where the share sheet's Print is one tap away.
 */
export function printPdf(file: string) {
  if (isIOS()) {
    window.open(file, '_blank', 'noopener')
    return
  }
  document.getElementById('pdf-print-frame')?.remove()
  const frame = document.createElement('iframe')
  frame.id = 'pdf-print-frame'
  frame.title = 'Print'
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0'
  frame.src = file
  frame.onload = () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      window.open(file, '_blank', 'noopener')
    }
  }
  document.body.appendChild(frame)
}
