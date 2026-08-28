import * as pdfjs from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { Worker as OcrWorker } from 'tesseract.js'
import { ocrScannedPage, terminateOcrWorker } from './ocr'

// Configure worker. Vite handles the ESM worker module.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

export interface TextSpan {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
  fontSize: number
  page: number
  line: number
}

export interface ParsedPage {
  page: number
  width: number
  height: number
  text: string
  spans: TextSpan[]
}

export interface ParsedDocument {
  id: string
  name: string
  pageCount: number
  pages: ParsedPage[]
}

export async function parsePdf(id: string, name: string, bytes: Uint8Array): Promise<ParsedDocument> {
  const pdf = await pdfjs.getDocument({ data: bytes }).promise
  const pageCount = pdf.numPages
  const pages: ParsedPage[] = []
  let ocrWorker: OcrWorker | undefined

  try {
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.0 })
      const content = await page.getTextContent()
      let spans: TextSpan[] = []
      let line = 0
      let lastY: number | undefined

      for (const item of content.items) {
        const ti = item as TextItem
        if (!ti.str) continue
        const transform = ti.transform
        const x = transform[4]
        const y = transform[5]
        if (lastY === undefined || Math.abs(y - lastY) > 1) {
          line++
          lastY = y
        }
        spans.push({
          text: ti.str,
          x,
          y: viewport.height - y,
          width: ti.width,
          height: ti.height,
          fontName: typeof ti.fontName === 'string' ? ti.fontName : 'unknown',
          fontSize: ti.height,
          page: i,
          line,
        })
      }

      // Scanned pages are just images — no text layer. Fall back to OCR,
      // which produces the same span shape from word bounding boxes.
      if (spans.map((s) => s.text).join('').trim().length < 10) {
        const ocr = await ocrScannedPage(page, i, ocrWorker)
        spans = ocr.spans
        ocrWorker = ocr.worker
      }

      const text = spans.map((s) => s.text).join(' ')
      pages.push({
        page: i,
        width: viewport.width,
        height: viewport.height,
        text,
        spans,
      })
    }
  } finally {
    if (ocrWorker) await terminateOcrWorker(ocrWorker)
  }

  return { id, name, pageCount, pages }
}
