export interface SerializedFileTree {
  files: string[][]
}

export interface FileTreeDiff {
  added: string[]
  changed: string[]
  removed: string[]
}

export class FileTree {
  constructor (public files: Record<string, string> = {}) {}

  list (path = '/'): string[] {
    if (!path.endsWith('/')) path = `${path}/`
    return Object.entries(this.files).filter(([filepath, blobRef]) => filepath.startsWith(path)).map(([filepath]) => filepath)
  }

  read (path: string): string|undefined {
    return this.files[path]
  }

  write (path: string, blobRef: string) {
    this.files[path] = blobRef
  }

  delete (path: string) {
    delete this.files[path]
  }

  diff (other: FileTree): FileTreeDiff {
    const diff: FileTreeDiff = {added: [], changed: [], removed: []}
    for (const path in this.files) {
      if (!other.files[path]) diff.removed.push(path)
      else if (other.files[path] !== this.files[path]) diff.changed.push(path)
    }
    for (const path in other.files) {
      if (!this.files[path]) diff.added.push(path)
    }
    return diff
  }

  toJSON (): SerializedFileTree {
    return {
      files: Object.entries(this.files).sort((a, b) => a[0].localeCompare(b[0]))
    }
  }

  fromJSON (obj: SerializedFileTree) {
    this.files = Object.fromEntries(obj.files || [])
  }
}