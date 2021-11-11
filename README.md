# Untitled File Editor Project

A peer-to-peer text editor built on [Hypercore's new multiwriter Autobase](https://github.com/hypercore-protocol/autobase).

## Implementation notes

### Hypercore schemas

The repo is an Autobase which uses oplog inputs and a Hyperbee for the index index. All data is encoded using msgpack.

The Hyperbee index uses the following layout:

```
/_meta = {
  schema: 'untitled-file-editor-project',
  writerKeys: Buffer[]
}
/trees/$tree = {
  commit: string, // id of the commit that created this tree
  conflicts: number[], // seq numbers of currently-conflicting trees
  files: [
    // path        blob-ref (hash)
    ['/foo.txt', 'sha256-123ad..df'],
    ['/bar.txt', 'sha256-dkc22..12']
  ]
}
/commits/$tree/$id = {
  id: string, // random generated ID
  writer: Buffer, // key of the core that authored the commit
  parents: string[] // IDs of commits which preceded this commit
  message: string // a description of the commit
}
/blobs/{hash} = {
  writer: Buffer
  start: number
  end: number
}
```

The oplogs include one of the following message types:

```
Commit {
  id: string, // random generated ID
  parents: string[] // IDs of commits which preceded this commit
  message: string // a description of the commit
  files: [
    // path        blob-ref (hash)
    ['/foo.txt', 'sha256-123ad..df'],
    ['/bar.txt', 'sha256-dkc22..12']
  ]
}
BlobChunk {
  hash: string // hash to which this blob belongs
  value: Buffer // content
}
```

### Managing writers

Only the creator of the Repo maintains the Hyperbee index as a hypercore. The owner updates the `/_meta` entry to determine the current writers.

This is a temporary design until Autoboot lands.
