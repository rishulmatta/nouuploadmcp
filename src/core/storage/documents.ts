import { getStorage } from './index'
import { parsePdf, type ParsedDocument } from '../ingest/pdf'

export interface DocumentMeta {
  id: string
  name: string
  size: number
  pageCount: number
  createdAt: number
}

const DOC_DIR = 'docs'
const PAGE_DIR = 'pages'

function docPath(id: string) {
  return `${DOC_DIR}/${id}.pdf`
}

function pagePath(id: string, page: number) {
  return `${PAGE_DIR}/${id}/${page}.json`
}

async function writeJson(path: string, value: unknown) {
  const storage = await getStorage()
  await storage.writeFile(path, JSON.stringify(value))
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    const storage = await getStorage()
    const text = await storage.readText(path)
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

export async function saveDocument(id: string, name: string, bytes: Uint8Array): Promise<DocumentMeta> {
  const storage = await getStorage()
  await storage.writeFile(docPath(id), bytes)

  const parsed = await parsePdf(id, name, bytes)
  for (const page of parsed.pages) {
    await writeJson(pagePath(id, page.page), page)
  }

  const meta: DocumentMeta = {
    id,
    name,
    size: bytes.length,
    pageCount: parsed.pageCount,
    createdAt: Date.now(),
  }
  await appendDocumentMeta(meta)
  return meta
}

export async function loadDocumentBytes(id: string): Promise<Uint8Array> {
  const storage = await getStorage()
  return storage.readFile(docPath(id))
}

export async function loadParsedPage(id: string, page: number): Promise<ParsedDocument['pages'][number] | undefined> {
  return readJson(pagePath(id, page))
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  try {
    const storage = await getStorage()
    const lines = await storage.readLines('meta.jsonl')
    return lines.map((l) => JSON.parse(l) as DocumentMeta)
  } catch {
    return []
  }
}

async function appendDocumentMeta(meta: DocumentMeta) {
  const storage = await getStorage()
  await storage.appendLine('meta.jsonl', JSON.stringify(meta))
}
