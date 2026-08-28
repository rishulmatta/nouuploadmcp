import type { StorageDriver } from './types'

async function getRoot(): Promise<FileSystemDirectoryHandle | undefined> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return undefined
  try {
    return await navigator.storage.getDirectory()
  } catch {
    return undefined
  }
}

async function getPath(
  root: FileSystemDirectoryHandle,
  path: string,
  create: boolean,
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle | undefined> {
  const parts = path.split('/').filter(Boolean)
  let dir = root
  for (let i = 0; i < parts.length - (create || path.endsWith('/') ? 0 : 1); i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create })
  }
  if (path.endsWith('/')) return dir
  const name = parts[parts.length - 1]
  if (!name) return dir
  return await dir.getFileHandle(name, { create })
}

class OpfsDriver implements StorageDriver {
  private rootPromise = getRoot()

  async writeFile(path: string, data: Uint8Array | string): Promise<void> {
    const root = await this.rootPromise
    if (!root) throw new Error('OPFS not available')
    const handle = await getPath(root, path, true)
    if (!handle || handle.kind !== 'file') throw new Error(`Invalid path: ${path}`)
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  async readFile(path: string): Promise<Uint8Array> {
    const root = await this.rootPromise
    if (!root) throw new Error('OPFS not available')
    const handle = await getPath(root, path, false)
    if (!handle || handle.kind !== 'file') throw new Error(`File not found: ${path}`)
    const file = await handle.getFile()
    return new Uint8Array(await file.arrayBuffer())
  }

  async readText(path: string): Promise<string> {
    const root = await this.rootPromise
    if (!root) throw new Error('OPFS not available')
    const handle = await getPath(root, path, false)
    if (!handle || handle.kind !== 'file') throw new Error(`File not found: ${path}`)
    const file = await handle.getFile()
    return await file.text()
  }

  async exists(path: string): Promise<boolean> {
    const root = await this.rootPromise
    if (!root) return false
    try {
      const handle = await getPath(root, path, false)
      return !!handle
    } catch {
      return false
    }
  }

  async listFiles(dir: string): Promise<string[]> {
    const root = await this.rootPromise
    if (!root) return []
    const handle = await getPath(root, dir.endsWith('/') ? dir : dir + '/', false)
    if (!handle || handle.kind !== 'directory') return []
    const names: string[] = []
    for await (const entry of (handle as FileSystemDirectoryHandle).values()) {
      names.push(entry.name)
    }
    return names
  }

  async deleteFile(path: string): Promise<void> {
    const root = await this.rootPromise
    if (!root) throw new Error('OPFS not available')
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return
    const name = parts.pop()!
    let dir = root
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part)
    }
    await dir.removeEntry(name, { recursive: true })
  }

  async appendLine(path: string, line: string): Promise<void> {
    const root = await this.rootPromise
    if (!root) throw new Error('OPFS not available')
    const handle = await getPath(root, path, true)
    if (!handle || handle.kind !== 'file') throw new Error(`Invalid path: ${path}`)
    const file = await handle.getFile()
    const existing = await file.text()
    const writable = await handle.createWritable()
    await writable.write(existing + line + '\n')
    await writable.close()
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

export const opfsDriver = new OpfsDriver()
