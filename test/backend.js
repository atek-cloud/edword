const ava = require('ava')
const ram = require('random-access-memory')
const pump = require('pump')
const { Backend } = require('../dist/api.js')

ava('single-writer', async t => {
  const inst1 = new Backend(ram)
  const repo = await inst1.createRepo()

  await inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  
  await t.throwsAsync(() => inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World', undefined))
  await inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')

  await inst1.delRepoFile(repo.key, 'HelloWorld')
  t.falsy(await inst1.getRepoFile(repo.key, 'HelloWorld'))

  await inst1.putRepoFile(repo.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
})

ava('single-writer, remote read', async t => {
  const inst1 = new Backend(ram)
  const inst2 = new Backend(ram)
  connectBackends(inst1, inst2)
  const repo = await inst1.createRepo()
  await inst2.addRepo(repo.key.toString('hex'))

  await inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  const doc1rev1_2 = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, '# Hello World')
  
  await t.throwsAsync(() => inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World', undefined))
  await inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')
  const doc1rev2_2 = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev2_2.key, 'HelloWorld')
  t.is(doc1rev2_2.value, '# Hello World!!')

  await inst1.delRepoFile(repo.key, 'HelloWorld')
  t.falsy(await inst1.getRepoFile(repo.key, 'HelloWorld'))
  t.falsy(await inst2.getRepoFile(repo.key, 'HelloWorld'))

  await inst1.putRepoFile(repo.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
  const doc1history_2 = await inst2.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history_2.length, 3)
  t.is(doc1history_2[0].value, '# Hello World')
  t.is(doc1history_2[1].value, '# Hello World!!')
  t.falsy(doc1history_2[2].value)
})

ava('dual-writer, connected', async t => {
  const inst1 = new Backend(ram)
  const inst2 = new Backend(ram)
  connectBackends(inst1, inst2)
  const repo = await inst1.createRepo()
  await inst2.addRepo(repo.key)

  // create a writer on inst2 and add it to inst1
  const remoteRepoInfo = await inst2.createRepoWriter(repo.key)
  await inst1.addRepoWriter(repo.key, remoteRepoInfo.writers.find(w => w.writable).key)

  await inst1.putRepoFile(repo.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  const doc1rev1_2 = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, '# Hello World')
  
  await t.throwsAsync(() => inst2.putRepoFile(repo.key, 'HelloWorld', '# Hello World', undefined))
  await inst2.putRepoFile(repo.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')
  const doc1rev2_2 = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev2_2.key, 'HelloWorld')
  t.is(doc1rev2_2.value, '# Hello World!!')

  await inst2.delRepoFile(repo.key, 'HelloWorld')
  t.falsy(await inst1.getRepoFile(repo.key, 'HelloWorld'))
  t.falsy(await inst2.getRepoFile(repo.key, 'HelloWorld'))

  await inst1.putRepoFile(repo.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
  const doc1history_2 = await inst2.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history_2.length, 3)
  t.is(doc1history_2[0].value, '# Hello World')
  t.is(doc1history_2[1].value, '# Hello World!!')
  t.falsy(doc1history_2[2].value)
})

ava('dual-writer, disconnected', async t => {
  const inst1 = new Backend(ram)
  const inst2 = new Backend(ram)
  connectBackends(inst1, inst2)
  const repo = await inst1.createRepo()
  await inst2.addRepo(repo.key)

  // create a writer on inst2 and add it to inst1
  const remoteRepoInfo = await inst2.createRepoWriter(repo.key)
  await inst1.addRepoWriter(repo.key, remoteRepoInfo.writers.find(w => w.writable).key)

  // now that they're paired, disconnect them
  disconnectBackends(inst1, inst2)

  await inst1.putRepoFile(repo.key, 'HelloWorld', 'writer1', 0)
  await inst2.putRepoFile(repo.key, 'HelloWorld', 'writer2', 0)
  
  const doc1rev1 = await inst1.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, 'writer1')
  const doc1rev1_2 = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, 'writer2')

  // now reconnect them
  connectBackends(inst1, inst2)
  
  const doc1rev1Merged = await inst1.getRepoFile(repo.key, 'HelloWorld')
  const doc1rev1_2Merged = await inst2.getRepoFile(repo.key, 'HelloWorld')
  t.truthy(['writer1', 'writer2'].includes(doc1rev1Merged.value))
  t.truthy(['writer1', 'writer2'].includes(doc1rev1_2Merged.value))
  t.is(doc1rev1Merged.value, doc1rev1_2Merged.value)
  
  const doc1history = await inst1.listRepoFileHistory(repo.key, 'HelloWorld')
  const doc1history_2 = await inst1.listRepoFileHistory(repo.key, 'HelloWorld')
  t.is(doc1history.length, 2)
  t.is(doc1history_2.length, 2)
  t.is(doc1history[1].value, doc1rev1Merged.value)
  t.is(doc1history_2[1].value, doc1rev1_2Merged.value)
})

const connections = new Map()
function connectBackends (inst1, inst2) {
  const s = inst1.store.replicate(true)
  connections.set(`${inst1._id}:${inst2._id}`, s)
  pump(s, inst2.store.replicate(false), s, err => {
    // console.log('Replication error', err)
  })
}
function disconnectBackends (inst1, inst2) {
  connections.get(`${inst1._id}:${inst2._id}`)?.destroy()
  connections.delete(`${inst1._id}:${inst2._id}`)
}