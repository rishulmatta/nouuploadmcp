import { opfsDriver } from './opfs'
import { idbDriver } from './idb'
import type { StorageDriver } from './types'

async function supportsOpfs(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('storage' in navigator)) return false
  try {
    const root = await navigator.storage.getDirectory()
    return !!root
  } catch {
    return false
  }
}

let driverPromise: Promise<StorageDriver> | undefined

export async function getStorage(): Promise<StorageDriver> {
  if (!driverPromise) {
    driverPromise = supportsOpfs().then((ok) => (ok ? opfsDriver : idbDriver))
  }
  return driverPromise
}

export async function resetStorageDriver() {
  driverPromise = undefined
}
