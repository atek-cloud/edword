# P2Wiki

A peer-to-peer wiki built on [Hypercore's new multiwriter Autobase](https://github.com/hypercore-protocol/autobase).

## Implementation notes

### Bee schema

The Wiki is an Autobase which uses oplog inputs and a Hyperbee index. The generated Hyperbee uses the following layout:

```
/_meta = {schema: 'p2wiki', writerKeys: [$writerPubKeys...]}
/docs/$docKey = $docValue
```

### Managing writers

Only the creator of the Wiki maintains the Hyperbee index as a hypercore. The owner updates the `/_meta` entry to determine the current writers.

This is a temporary design until Autoboot lands.

### Multiwriter

The Wiki does not track conflicts and defaults to last-writer wins. Users can consult the history of changes to a document to discover lost writes.

Conflict-tracking can be added once a stable [Autobee](https://github.com/pfrazee/autobee/tree/oplog-optimized) has been developed.

When writing a document from the frontend, the current seq of the document must be included and be `>=` the current value. If it is not, the write will be rejected and the frontend must accomplish a merge before attempting to write again.