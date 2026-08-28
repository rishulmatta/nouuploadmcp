import { createWorker, type Worker } from 'tesseract.js'
import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextSpan } from './pdf'

// Render scale for OCR — ~180 DPI, enough for clean 200 DPI scans.
const RENDER_SCALE = 2.5

// All runtime assets are vendored in public/tesseract so OCR runs fully
// offline — no CDN fetch, consistent with the no-upload guarantee.
async function createOcrWorker(): Promise<Worker> {
  return createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tesseract',
    gzip: true,
  })
}

interface OcrBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface OcrWord {
  text: string
  bbox: OcrBox
}

interface OcrLine {
  words: OcrWord[]
}

interface OcrParagraph {
  lines: OcrLine[]
}

interface OcrBlock {
  paragraphs: OcrParagraph[]
}

/**
 * Render a scanned PDF page to a canvas and OCR it, returning TextSpans in the
 * same shape pdf.js text extraction produces: page units, top-origin y, one
 * span per word, `line` grouping words into visual lines.
 */
export async function ocrScannedPage(
  page: PDFPageProxy,
  pageNumber: number,
  worker?: Worker,
): Promise<{ spans: TextSpan[]; worker: Worker }> {
  const w = worker ?? (await createOcrWorker())

  const viewport = page.getViewport({ scale: RENDER_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise

  const { data } = await w.recognize(canvas, {}, { blocks: true })

  const spans: TextSpan[] = []
  let line = 0
  for (const block of data.blocks ?? []) {
    for (const para of (block as OcrBlock).paragraphs ?? []) {
      for (const ln of (para as OcrParagraph).lines ?? []) {
        line++
        for (const word of (ln as OcrLine).words ?? []) {
          if (!word.text?.trim()) continue
          const { x0, y0, x1, y1 } = word.bbox
          const height = (y1 - y0) / RENDER_SCALE
          spans.push({
            text: word.text,
            x: x0 / RENDER_SCALE,
            y: y0 / RENDER_SCALE,
            width: (x1 - x0) / RENDER_SCALE,
            height,
            fontName: 'ocr',
            fontSize: height,
            page: pageNumber,
            line,
          })
        }
      }
    }
  }

  return { spans, worker: w }
}

export async function terminateOcrWorker(worker: Worker): Promise<void> {
  await worker.terminate()
}
