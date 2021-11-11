import concat from 'concat-stream'
import pump from 'pump'
// @ts-ignore no types available yet -prf
import Corestore from 'corestore'
import lock from './lib/lock.js'
import { Repo } from './hyper/repo.js'

// exported api
// =

export interface GetRepoFileOpts {
  seq?: number
}

let _idCounter = 1
export class Backend {
  _id = _idCounter++ // used for debugging
  store: Corestore
  repos: Repo[] = []

  constructor (corestoreOpts: any) {
    this.store = new Corestore(corestoreOpts)
  }

  _getRepo (repoKey: string): Repo {
    const repo = this.repos.find(w => w.key.toString('hex') === repoKey)
    if (!repo) throw new NotFoundError()
    return repo
  }

  async createRepo () {
    const repo = await Repo.createNew(this.store)
    this.repos.push(repo)
    return repo.toJSON()
  }

  async addRepo (repoKey: string) {
    const repo = await Repo.load(this.store, repoKey)
    this.repos.push(repo)
    return repo.toJSON()
  }
  
  async listRepos () {
    return await Promise.resolve(this.repos.map(w => w.toJSON()))
  }
  
  async getRepo (repoKey: string) {
    const repo = this._getRepo(repoKey)
    return await Promise.resolve(repo.toJSON())
  }
  
  async delRepo (repoKey: string) {
    const index = this.repos.findIndex(w => w.key.toString('hex') === repoKey)
    if (index !== -1) this.repos.splice(index, 1)
    return await Promise.resolve(undefined)
  }

  async createRepoWriter (repoKey: string) {
    const repo = this._getRepo(repoKey)
    await repo.createWriter()
    return await Promise.resolve(repo.toJSON())
  }

  async addRepoWriter (repoKey: string, writerKey: string) {
    const repo = this._getRepo(repoKey)
    await repo.addWriter(writerKey)
    return await Promise.resolve(repo.toJSON())
  }

  async removeRepoWriter (repoKey: string, writerKey: string) {
    const repo = this._getRepo(repoKey)
    await repo.removeWriter(writerKey)
    return await Promise.resolve(repo.toJSON())
  }
  
  async listRepoFiles (repoKey: string) {
    const repo = this._getRepo(repoKey)  
    return await new Promise((resolve, reject) => {
      pump(
        repo.sub('main').createReadStream(),
        concat(resolve),
        reject
      )
    })
  }
  
  async searchRepoFiles (repoKey: string, query: string) {
    const repo = this._getRepo(repoKey)  
    return await new Promise((resolve, reject) => {
      pump(
        repo.sub('main').createReadStream(),
        concat((entries: any) => {
          // TODO filter by query
          resolve(entries)
        }),
        reject
      )
    })
  }
  
  async getRepoFile (repoKey: string, fileKey: string, opts?: GetRepoFileOpts) {
    const repo = this._getRepo(repoKey)

    // TODO: historic get
  
    return (await repo.sub('main').get(fileKey))
  }
  
  async listRepoFileHistory (repoKey: string, fileKey: string, opts?: any) {
    const repo = this._getRepo(repoKey)
    return await new Promise((resolve, reject) => {
      pump(
        repo.sub('main').createKeyedHistoryStream(fileKey, opts),
        concat(resolve),
        reject
      )
    })
  }
  
  async putRepoFile (repoKey: string, fileKey: string, fileValue: string, seq: number|undefined) {
    const repo = this._getRepo(repoKey)
  
    const release = await lock(`put:${repoKey}:${fileKey}`)
    try {
      const current = await repo.sub('main').get(fileKey)
      if (current && (typeof seq === 'undefined' || current.seq > seq)) {
        throw new ConflictError()
      }
      await repo.sub('main').put(fileKey, fileValue)
    } finally {
      release()
    }
  }
  
  async delRepoFile (repoKey: string, fileKey: string) {
    const repo = this._getRepo(repoKey)
    await repo.sub('main').del(fileKey)
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
