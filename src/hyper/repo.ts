// @ts-ignore no types available yet -prf
import crypto from 'hypercore-crypto'
// @ts-ignore no types available yet -prf
import Corestore from 'corestore'
// @ts-ignore no types available yet -prf
import Hypercore from 'hypercore'
// @ts-ignore no types available yet -prf
import Autobase from 'autobase'
// @ts-ignore no types available yet -prf
import Hyperbee from 'hyperbee'
// @ts-ignore no types available yet -prf
import HyperbeeMessages from 'hyperbee/lib/messages.js'
import pump from 'pump'
import through from 'through2'
import lock from '../lib/lock.js'

export interface RepoMeta {
  schema: string
  writerKeys: string[]
}

export interface RepoOpts {
  writers?: RepoWriter[]
  index: RepoIndex
}

export interface WriteOpts {
  writer?: Buffer|Hypercore
  prefix?: string
}

export class BaseRepoCore {
  core: Hypercore
  constructor (public store: Corestore, public publicKey: Buffer, public secretKey?: Buffer) {
    this.core = store.get({publicKey, secretKey})
  }

  get writable () {
    return !!this.secretKey
  }

  toJSON () {
    return {
      key: this.publicKey.toString('hex'),
      writable: this.writable
    }
  }

  serialize () {
    return {
      publicKey: this.publicKey.toString('hex'),
      secretKey: this.secretKey?.toString('hex'),
    }
  }
}

export class RepoWriter extends BaseRepoCore {
  static createNew (store: Corestore) {
    const keyPair = crypto.keyPair()
    return new RepoWriter(store, keyPair.publicKey, keyPair.secretKey)
  }

  static load (store: Corestore, publicKey: string, secretKey?: string) {
    return new RepoWriter(
      store,
      Buffer.from(publicKey, 'hex'),
      secretKey ? Buffer.from(secretKey, 'hex') : undefined
    )
  }
}

export class RepoIndex extends BaseRepoCore {
  static createNew (store: Corestore) {
    const keyPair = crypto.keyPair()
    return new RepoIndex(store, keyPair.publicKey, keyPair.secretKey)
  }

  static load (store: Corestore, publicKey: string, secretKey?: string) {
    return new RepoIndex(
      store,
      Buffer.from(publicKey, 'hex'),
      secretKey ? Buffer.from(secretKey, 'hex') : undefined
    )
  }
}

export class Repo {
  autobase: Autobase
  indexBee: Hyperbee
  meta: RepoMeta|undefined
  writers: RepoWriter[]
  index: RepoIndex
  constructor (public store: Corestore, {writers, index}: RepoOpts) {
    this.writers = writers || []
    this.index = index || undefined
    const inputs = this.writers.map(w => w.core)
    const defaultInput = inputs.find(core => core.writable)
    this.autobase = new Autobase(inputs, {indexes: index ? [index.core] : [], input: defaultInput})

    const indexCore = this.autobase.createRebasedIndex({
      unwrap: true,
      apply: this._apply.bind(this)
    })
    this.indexBee = new Hyperbee(indexCore, {
      extension: false,
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
  }

  static async createNew (store: Corestore) {
    const repo = new Repo(store, {
      writers: [RepoWriter.createNew(store)],
      index: RepoIndex.createNew(store)
    })
    await repo.ready()
    await repo.persistMeta()
    return repo
  }

  static async load (store: Corestore, publicKey: string) {
    const repo = new Repo(store, {
      writers: [],
      index: RepoIndex.load(store, publicKey)
    })
    await repo.ready()
    await repo.loadFromMeta()
    await repo.watchMeta()
    return repo
  }

  async ready () {
    await this.autobase.ready()
    await this.indexBee.ready()
  }

  get key () {
    return this.index.publicKey
  }

  get writable () {
    return !!this.autobase.inputs.find((core: Hypercore) => core.writable)
  }

  get isOwner () {
    return this.index.writable
  }

  watchMeta () {
    this.index.core.on('append', () => {
      // TODO can we make this less stupid?
      this.loadFromMeta()
    })
  }

  async loadFromMeta () {
    const meta = (await this.get('_meta'))?.value || {schema: 'p2wiki', writerKeys: []}
    
    const release = await lock(`loadFromMeta:${this.key.toString('hex')}`)
    try {
      this.meta = meta
      for (const key of meta.writerKeys) {
        if (!this.writers.find(w => w.publicKey.toString('hex') === key)) {
          await this.addWriter(key)
        }
      }
      for (const w of this.writers) {
        if (!meta.writerKeys.includes(w.publicKey.toString('hex'))) {
          await this.removeWriter(w.publicKey)
        }
      }
    } finally {
      release()
    }
  }

  async persistMeta () {
    if (!this.isOwner) return
    this.meta = {schema: 'p2wiki', writerKeys: this.writers.map(w => w.publicKey.toString('hex'))}
    await this.put('_meta', this.meta)
  }

  serialize () {
    return {
      key: this.key.toString('hex'),
      writers: this.writers.map(w => w.serialize()),
      index: this.index.serialize()
    }
  }

  toJSON () {
    return {
      key: this.key.toString('hex'),
      writable: this.writable,
      writers: this.writers.map(w => w.toJSON())
    }
  }

  async createWriter () {
    const writer = RepoWriter.createNew(this.store)
    await writer.core.ready()
    this.writers.push(writer)
    this.autobase.addInput(writer.core)
    await this.persistMeta()
    return writer
  }

  async addWriter (publicKey: string) {
    const writer = RepoWriter.load(this.store, publicKey)
    await writer.core.ready()
    this.writers.push(writer)
    this.autobase.addInput(writer.core)
    await this.persistMeta()
    return writer
  }

  async removeWriter (publicKey: string|Buffer) {
    publicKey = (Buffer.isBuffer(publicKey)) ? publicKey : Buffer.from(publicKey, 'hex')
    const i = this.writers.findIndex(w => w.publicKey.equals(publicKey as Buffer))
    if (i === -1) throw new Error('Writer not found')
    this.autobase.removeInput(this.writers[i].core)
    this.writers.splice(i, 1)
    await this.persistMeta()
  }

  async get (key: string, opts?: any) {
    return await this.indexBee.get(key, opts)
  }

  createReadStream (opts?: any) {
    return this.indexBee.createReadStream(opts)
  }

  createKeyedHistoryStream (key: string, opts?: any) {
    return pump(this.indexBee.createHistoryStream(opts), through.obj(function (entry, enc, cb) {
      if (entry.key === key) {
        this.push(entry)
      }
      cb()
    }))
  }

  async put (key: string, value: any, opts?: WriteOpts) {
    const core = getWriterCore(this, opts)
    if (opts?.prefix) key = `${opts.prefix}${key}`
    const op = {
      op: 'put',
      key,
      value
    }
    return await this.autobase.append(JSON.stringify(op), null, core)
  }

  async del (key: string, opts?: WriteOpts) {
    const core = getWriterCore(this, opts)
    if (opts?.prefix) key = `${opts.prefix}${key}`
    const op = {
      op: 'del',
      key
    }
    return await this.autobase.append(JSON.stringify(op), null, core)
  }

  sub (prefix: string) {
    const indexBeeSub = this.indexBee.sub(prefix)

    let _prefix = prefix
    if (!_prefix.endsWith('\x00')) _prefix = `${_prefix}\x00`
    indexBeeSub.createKeyedHistoryStream = (key: string, opts?: any) => {
      key = `${_prefix}${key}`
      return this.createKeyedHistoryStream(key, opts)
    }
    indexBeeSub.put = (key: string, value: any, opts?: WriteOpts) => {
      opts = opts || {}
      opts.prefix = _prefix
      return this.put(key, value, opts)
    }
    indexBeeSub.del = (key: string, opts?: WriteOpts) => {
      opts = opts || {}
      opts.prefix = _prefix
      return this.del(key, opts)
    }
    return indexBeeSub
  }

  async _apply (batch: any[], clocks: any) {
    if (this.indexBee._feed.length === 0) {
      // HACK
      // when the indexBee is using the in-memory rebased core
      // (because it doesnt have one of its own, and is relying on a remote index)
      // it doesn't correctly write its header
      // so we do it here
      // -prf
      await this.indexBee._feed.append(HyperbeeMessages.Header.encode({
        protocol: 'hyperbee'
      }))
    }

    const b = this.indexBee.batch({ update: false })
    for (const node of batch) {
      let op = undefined
      try {
        op = JSON.parse(node.value)
      } catch (e) {
        // skip: not an op
        console.error('Warning: not an op', node.value, e)
        continue
      }

      // console.debug('OP', op)
      if (!op.op) {
        // skip: not an op
        console.error('Warning: not an op', op)
        continue
      }

      // console.log('handling', op)

      if (op.key && op.op === 'del') {
        await b.del(op.key)
      } else if (op.key && op.op === 'put') {
        await b.put(op.key, op.value)
      }
    }
    await b.flush()
  }
}

function getWriterCore (repo: Repo, opts?: WriteOpts) {
  let writer
  if (opts?.writer) {
    if (opts.writer instanceof RepoWriter) {
      writer = repo.writers.find(w => w === opts.writer)
    } else if (Buffer.isBuffer(opts.writer)) {
      writer = repo.writers.find(w => w.publicKey.equals(opts.writer)) 
    }
  } else {
    writer = repo.writers.find(w => w.core === repo.autobase.defaultInput) || repo.writers.find(w => w.writable)
  }
  if (!writer) {
    throw new Error(`Not a writer: ${opts?.writer}`)
  }
  if (!writer.writable) {
    throw new Error(`Not writable: ${opts?.writer}`)
  }
  return writer.core
}
