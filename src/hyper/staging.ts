import { createHash } from 'crypto'
import { FileTree } from './filetree.js'

export class BaseFilestore {
  hash (buf: Buffer): string {
    const hashSum = createHash('sha256')
    hashSum.update(buf)
    return `sha256-${hashSum.digest('hex')}`
  }
}

export class Staging extends BaseFilestore {
  fileTree: FileTree = new FileTree()
  blobs: Map<string, Buffer> = new Map()

  list (path = '/') {
    return this.fileTree.list(path)
  }

  async read (path: string): Promise<Buffer|undefined> {
    const blobRef = this.fileTree.read(path)
    if (blobRef) {
      const blob = this.blobs.get(blobRef)
      if (!blob) throw new BlobNotFoundError()
      return await Promise.resolve(blob)
    } else {
      return undefined
    }
  }

  async write (path: string, blob: Buffer) {
    const blobRef = this.hash(blob)
    if (!this.blobs.has(blobRef)) {
      this.blobs.set(blobRef, blob)
    }
    this.fileTree.write(path, blobRef)
    return await Promise.resolve(undefined)
  }

  async delete (path: string) {
    this.fileTree.delete(path)
    return await Promise.resolve(undefined)
  }
}

export class BlobNotFoundError extends Error {
  httpCode = 500
  constructor (message?: string) {
    super(message || '')
    this.name = 'BlobNotFoundError'
  }
}
