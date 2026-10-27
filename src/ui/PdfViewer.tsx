import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useSettings } from '../systems/settings'
import { printPdf } from './printPdf'

/** Zoom steps, as a share of the fitted width (1 = the page fills the viewer's width). */
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const
const FIT = ZOOMS.indexOf(1)
/** Room around the pages inside the scroller (px, each side). */
const GUTTER = 12
/** Never paint a canvas wider than this many device pixels (memory on phones at high zoom). */
const MAX_CANVAS = 4096

/** pdf.js, loaded only when a viewer first opens (it's large), with its worker beside it. */
let pdfjsLoad: Promise<typeof import('pdfjs-dist')> | null = null
function loadPdfjs() {
  pdfjsLoad ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default
    return lib
  })
  return pdfjsLoad
}

interface Props {
  file: string
  /** What the document is, for screen readers ("Resume"). */
  title: string
  /** File name a download is saved as. */
  downloadName: string
  /** Extra toolbar buttons (e.g. full screen), after the zoom controls. */
  extra?: ReactNode
  /** Listen for + / - / 0 on the keyboard. */
  keys?: boolean
  className?: string
}

/**
 * A PDF drawn in the site's own frame instead of the browser's viewer: pages as paper sheets on
 * the PC's grid, and a dark control bar with page and zoom controls, PRINT and DOWNLOAD. Pages fit
 * the width at 100% and are repainted crisp at each zoom; pinch (or ctrl + scroll) zooms too.
 */
export function PdfViewer({ file, title, downloadName, extra, keys = true, className = '' }: Props) {
  const { sfx } = useSettings()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failed, setFailed] = useState(false)
  const [zoom, setZoom] = useState(FIT)
  const [width, setWidth] = useState(0)
  const [page, setPage] = useState(1)
  // where the reader was (a share of the scroll height) when the zoom changed, to keep them there
  const anchor = useRef<number | null>(null)

  useEffect(() => {
    let live = true
    let task: ReturnType<typeof import('pdfjs-dist').getDocument> | null = null
    loadPdfjs()
      .then((lib) => {
        if (!live) return null
        task = lib.getDocument({ url: file })
        return task.promise
      })
      .then((d) => {
        if (live && d) setDoc(d)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      void task?.destroy()
    }
  }, [file])

  // fit to the viewer's width as it resizes
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageWidth = Math.max(0, width - GUTTER * 2) * ZOOMS[zoom]

  const zoomTo = (i: number) => {
    const n = Math.max(0, Math.min(ZOOMS.length - 1, i))
    if (n === zoom) return
    const el = scrollRef.current
    if (el) anchor.current = (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight)
    sfx('cursor')
    setZoom(n)
  }
  // once the pages have their new size, scroll so the same spot stays in the middle
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || anchor.current === null) return
    el.scrollTop = anchor.current * el.scrollHeight - el.clientHeight / 2
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    anchor.current = null
  }, [zoom])

  // the listeners below are bound once; they reach the current zoom through this
  const stepRef = useRef((to: number | 'in' | 'out') => zoomTo(to === 'in' ? zoom + 1 : to === 'out' ? zoom - 1 : to))
  useEffect(() => {
    stepRef.current = (to) => zoomTo(to === 'in' ? zoom + 1 : to === 'out' ? zoom - 1 : to)
  })

  // pinch on a trackpad / ctrl + wheel zooms the pages, not the whole site
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let last = 0
    const on = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const now = performance.now()
      if (now - last < 140 || Math.abs(e.deltaY) < 2) return
      last = now
      stepRef.current(e.deltaY < 0 ? 'in' : 'out')
    }
    el.addEventListener('wheel', on, { passive: false })
    return () => el.removeEventListener('wheel', on)
  }, [])

  useEffect(() => {
    if (!keys) return
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === '+' || e.key === '=') stepRef.current('in')
      else if (e.key === '-' || e.key === '_') stepRef.current('out')
      else if (e.key === '0') stepRef.current(FIT)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [keys])

  // which page is in the middle of the view
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const mid = el.scrollTop + el.clientHeight / 2
    const sheets = [...el.querySelectorAll<HTMLElement>('[data-page]')]
    const at = sheets.find((s) => s.offsetTop + s.offsetHeight > mid) ?? sheets[sheets.length - 1]
    if (at) setPage(Number(at.dataset.page))
  }
  const goPage = (n: number) => {
    const el = scrollRef.current
    const sheet = el?.querySelector<HTMLElement>(`[data-page="${n}"]`)
    if (!el || !sheet) return
    sfx('cursor')
    el.scrollTo({ top: sheet.offsetTop - GUTTER, behavior: 'smooth' })
    setPage(n)
  }

  const pages = doc?.numPages ?? 0
  const pct = `${Math.round(ZOOMS[zoom] * 100)}%`

  return (
    <div className={`pdf-viewer flex min-h-0 flex-col ${className}`}>
      <div className="pdf-bar flex flex-wrap items-center gap-x-3 gap-y-2 px-[2.5%] py-2" role="toolbar" aria-label={`${title} controls`}>
        <div className="flex items-center gap-1.5">
          <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => goPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            ◀
          </button>
          <span className="pdf-readout" aria-live="polite">
            P.{page}/{pages || '–'}
          </span>
          <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => goPage(page + 1)} disabled={!pages || page >= pages} aria-label="Next page">
            ▶
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => zoomTo(zoom - 1)} disabled={zoom === 0} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="pdf-readout pdf-readout--btn" onClick={() => zoomTo(FIT)} aria-label={`Zoom ${pct}. Reset to fit width`} title="Fit width (0)">
            {pct}
          </button>
          <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => zoomTo(zoom + 1)} disabled={zoom === ZOOMS.length - 1} aria-label="Zoom in">
            +
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {extra}
          <button type="button" className="dex-bar-btn pdf-bar-btn" onClick={() => printPdf(file)}>
            ⎙ PRINT
          </button>
          <a className="dex-bar-btn pdf-bar-btn pdf-bar-btn--go no-underline" href={file} download={downloadName}>
            ⬇ DOWNLOAD
          </a>
        </div>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="pdf-desk relative min-h-0 flex-1 overflow-auto" tabIndex={0} aria-label={`${title}, ${pages || 'loading'} pages`}>
        {failed ? (
          <p className="pdf-note">The resume couldn’t be drawn here. Use DOWNLOAD, or the TEXT tab.</p>
        ) : !doc || !pageWidth ? (
          <p className="pdf-note" aria-live="polite">
            LOADING<span className="pdf-dots" aria-hidden />
          </p>
        ) : (
          <div className="mx-auto flex w-max min-w-full flex-col items-center" style={{ gap: GUTTER, padding: GUTTER }}>
            {Array.from({ length: pages }, (_, i) => (
              <PdfPage key={i} doc={doc} n={i + 1} of={pages} width={pageWidth} title={title} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** One sheet: sized from the page's own shape at once, then painted at the screen's pixel density. */
function PdfPage({ doc, n, of, width, title }: { doc: PDFDocumentProxy; n: number; of: number; width: number; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ratio, setRatio] = useState(11 / 8.5)
  const [painted, setPainted] = useState(false)

  useEffect(() => {
    let live = true
    let task: { cancel(): void; promise: Promise<void> } | null = null
    // wait a beat so a run of zoom clicks paints once
    const id = window.setTimeout(async () => {
      const page = await doc.getPage(n)
      if (!live) return
      const base = page.getViewport({ scale: 1 })
      setRatio(base.height / base.width)
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const scale = Math.min((width * dpr) / base.width, MAX_CANVAS / base.width)
      const viewport = page.getViewport({ scale })
      // paint off-screen, then swap in, so the old sheet stays up until the new one is ready
      const off = document.createElement('canvas')
      off.width = Math.floor(viewport.width)
      off.height = Math.floor(viewport.height)
      task = page.render({ canvas: off, viewport })
      try {
        await task.promise
      } catch {
        return
      }
      if (!live) return
      canvas.width = off.width
      canvas.height = off.height
      canvas.getContext('2d')?.drawImage(off, 0, 0)
      setPainted(true)
    }, 60)
    return () => {
      live = false
      window.clearTimeout(id)
      task?.cancel()
    }
  }, [doc, n, width])

  return (
    <div data-page={n} className="pdf-sheet relative shrink-0" style={{ width, height: width * ratio }}>
      <canvas ref={canvasRef} role="img" aria-label={`${title}, page ${n} of ${of}`} className="block h-full w-full" />
      {!painted && <span className="pdf-dots absolute inset-0 m-auto h-fit w-fit" aria-hidden />}
    </div>
  )
}
