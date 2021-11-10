import EventEmitter from 'events'
import concat from 'concat-stream'
import pump from 'pump'
// @ts-ignore no types available yet -prf
import Corestore from 'corestore'
import { Wiki } from './hyper/wiki.js'

// exported api
// =

export interface GetWikiDocOpts {
  seq?: number
}

let _idCounter = 1
export class P2WikiBackend {
  _id = _idCounter++ // used for debugging
  store: Corestore
  wikis: Wiki[] = []

  constructor (corestoreOpts: any) {
    this.store = new Corestore(corestoreOpts)
  }

  _getWiki (wikiKey: string): Wiki {
    const wiki = this.wikis.find(w => w.key.toString('hex') === wikiKey)
    if (!wiki) throw new NotFoundError()
    return wiki
  }

  async createWiki () {
    const wiki = await Wiki.createNew(this.store)
    this.wikis.push(wiki)
    return wiki.toJSON()
  }

  async addWiki (wikiKey: string) {
    const wiki = await Wiki.load(this.store, wikiKey)
    this.wikis.push(wiki)
    return wiki.toJSON()
  }
  
  async listWikis () {
    return await Promise.resolve(this.wikis.map(w => w.toJSON()))
  }
  
  async getWiki (wikiKey: string) {
    const wiki = this._getWiki(wikiKey)
    return await Promise.resolve(wiki.toJSON())
  }
  
  async delWiki (wikiKey: string) {
    const index = this.wikis.findIndex(w => w.key.toString('hex') === wikiKey)
    if (index !== -1) this.wikis.splice(index, 1)
    return await Promise.resolve(undefined)
  }

  async createWikiWriter (wikiKey: string) {
    const wiki = this._getWiki(wikiKey)
    await wiki.createWriter()
    return await Promise.resolve(wiki.toJSON())
  }

  async addWikiWriter (wikiKey: string, writerKey: string) {
    const wiki = this._getWiki(wikiKey)
    await wiki.addWriter(writerKey)
    return await Promise.resolve(wiki.toJSON())
  }

  async removeWikiWriter (wikiKey: string, writerKey: string) {
    const wiki = this._getWiki(wikiKey)
    await wiki.removeWriter(writerKey)
    return await Promise.resolve(wiki.toJSON())
  }
  
  async listWikiDocs (wikiKey: string) {
    const wiki = this._getWiki(wikiKey)  
    return await new Promise((resolve, reject) => {
      pump(
        wiki.sub('docs').createReadStream(),
        concat(resolve),
        reject
      )
    })
  }
  
  async searchWikiDocs (wikiKey: string, query: string) {
    const wiki = this._getWiki(wikiKey)  
    return await new Promise((resolve, reject) => {
      pump(
        wiki.sub('docs').createReadStream(),
        concat((entries: any) => {
          // TODO filter by query
          resolve(entries)
        }),
        reject
      )
    })
  }
  
  async getWikiDoc (wikiKey: string, docKey: string, opts?: GetWikiDocOpts) {
    const wiki = this._getWiki(wikiKey)

    // TODO: historic get
  
    return (await wiki.sub('docs').get(docKey))
  }
  
  async listWikiDocHistory (wikiKey: string, docKey: string, opts?: any) {
    const wiki = this._getWiki(wikiKey)
    return await new Promise((resolve, reject) => {
      pump(
        wiki.sub('docs').createKeyedHistoryStream(docKey, opts),
        concat(resolve),
        reject
      )
    })
  }
  
  async putWikiDoc (wikiKey: string, docKey: string, docValue: string, seq: number|undefined) {
    const wiki = this._getWiki(wikiKey)
  
    // TODO lock region

    const current = await wiki.sub('docs').get(docKey)
    if (current && (typeof seq === 'undefined' || current.seq > seq)) {
      throw new ConflictError()
    }
    await wiki.sub('docs').put(docKey, docValue)
  }
  
  async delWikiDoc (wikiKey: string, docKey: string) {
    const wiki = this._getWiki(wikiKey)
    await wiki.sub('docs').del(docKey)
  }
}

export class NotFoundError extends Error {
  httpCode = 404
  constructor (message?: string) {
    super(message || '')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  httpCode = 409
  constructor (message?: string) {
    super(message || '')
    this.name = 'ConflictError'
  }
}
