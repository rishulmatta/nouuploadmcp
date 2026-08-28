import { getStorage } from './index'
import { parsePdf, type ParsedDocument } from '../ingest/pdf'

export interface DocumentMeta {
  id: string
  name: string
  size: number
  pageCount: number
  createdAt: number
  plugin: string // which document set this belongs to, e.g. "finance" or "labs" — never cross-listed with another
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

export async function saveDocument(id: string, name: string, bytes: Uint8Array, plugin: string): Promise<DocumentMeta> {
  const existing = await listDocuments(plugin)
  const duplicates = existing.filter((d) => d.name === name)
  for (const dup of duplicates) {
    await deleteDocument(dup.id)
  }

  // pdf.js transfers bytes.buffer to its worker to parse, which detaches it —
  // bytes.length reads back as 0 after that. Capture the size first.
  const size = bytes.length

  const storage = await getStorage()
  await storage.writeFile(docPath(id), bytes)

  const parsed = await parsePdf(id, name, bytes)
  for (const page of parsed.pages) {
    await writeJson(pagePath(id, page.page), page)
  }

  const meta: DocumentMeta = {
    id,
    name,
    size,
    pageCount: parsed.pageCount,
    createdAt: Date.now(),
    plugin,
  }
  await appendDocumentMeta(meta)
  return meta
}

export async function deleteDocument(id: string): Promise<void> {
  const storage = await getStorage()
  await storage.deleteFile(docPath(id)).catch(() => {})
  const pages = await storage.listFiles(`${PAGE_DIR}/${id}`).catch(() => [])
  for (const page of pages) {
    await storage.deleteFile(pagePath(id, Number(page.replace('.json', '')))).catch(() => {})
  }
  await removeDocumentMeta(id)
}

async function removeDocumentMeta(id: string) {
  const storage = await getStorage()
  const lines = await storage.readLines('meta.jsonl')
  const kept = lines.filter((l) => (JSON.parse(l) as DocumentMeta).id !== id)
  await storage.writeFile('meta.jsonl', kept.length ? kept.join('\n') + '\n' : '')
}

export async function loadDocumentBytes(id: string): Promise<Uint8Array> {
  const storage = await getStorage()
  return storage.readFile(docPath(id))
}

export async function loadParsedPage(id: string, page: number): Promise<ParsedDocument['pages'][number] | undefined> {
  return readJson(pagePath(id, page))
}

export async function listDocuments(plugin?: string): Promise<DocumentMeta[]> {
  try {
    const storage = await getStorage()
    const lines = await storage.readLines('meta.jsonl')
    const docs = lines.map((l) => JSON.parse(l) as DocumentMeta)
    return plugin ? docs.filter((d) => d.plugin === plugin) : docs
  } catch {
    return []
  }
}

export async function getDocument(id: string): Promise<DocumentMeta | undefined> {
  return (await listDocuments()).find((d) => d.id === id)
}

async function appendDocumentMeta(meta: DocumentMeta) {
  const storage = await getStorage()
  await storage.appendLine('meta.jsonl', JSON.stringify(meta))
}
