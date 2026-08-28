import type { StorageDriver } from './types'

const DB_NAME = 'noupload-storage'
const DB_VERSION = 1
const STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
  })
}

class IdbDriver implements StorageDriver {
  private dbPromise: Promise<IDBDatabase>
  constructor() {
    this.dbPromise = openDb()
  }

  private key(path: string) {
    return path.startsWith('/') ? path : '/' + path
  }

  private async get(path: string): Promise<Uint8Array | undefined> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.get(this.key(path))
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result)
    })
  }

  private async put(path: string, data: Uint8Array): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.put(data, this.key(path))
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  }

  async writeFile(path: string, data: Uint8Array | string): Promise<void> {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    await this.put(path, bytes)
  }

  async readFile(path: string): Promise<Uint8Array> {
    const data = await this.get(path)
    if (!data) throw new Error(`File not found: ${path}`)
    return data
  }

  async readText(path: string): Promise<string> {
    const data = await this.get(path)
    if (!data) throw new Error(`File not found: ${path}`)
    return new TextDecoder().decode(data)
  }

  async exists(path: string): Promise<boolean> {
    const data = await this.get(path)
    return data !== undefined
  }

  async listFiles(dir: string): Promise<string[]> {
    const prefix = this.key(dir.endsWith('/') ? dir : dir + '/')
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const store = tx.objectStore(STORE)
      const req = store.getAllKeys()
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const keys = req.result as string[]
        resolve(
          keys
            .filter((k) => k.startsWith(prefix))
            .map((k) => k.slice(prefix.length).split('/')[0])
            .filter((v, i, a) => a.indexOf(v) === i),
        )
      }
    })
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.delete(this.key(path))
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  }

  async appendLine(path: string, line: string): Promise<void> {
    let existing = ''
    try {
      existing = await this.readText(path)
    } catch {
      // file doesn't exist yet
    }
    await this.writeFile(path, existing + line + '\n')
  }

  async readLines(path: string): Promise<string[]> {
    try {
      const text = await this.readText(path)
      return text.split('\n').filter((l) => l.trim().length > 0)
    } catch {
      return []
    }
  }
}

export const idbDriver = new IdbDriver()
