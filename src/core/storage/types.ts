export interface StorageDriver {
  writeFile(path: string, data: Uint8Array | string): Promise<void>
  readFile(path: string): Promise<Uint8Array>
  readText(path: string): Promise<string>
  exists(path: string): Promise<boolean>
  listFiles(dir: string): Promise<string[]>
  deleteFile(path: string): Promise<void>
  appendLine(path: string, line: string): Promise<void>
  readLines(path: string): Promise<string[]>
}
