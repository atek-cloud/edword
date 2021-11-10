import ava from 'ava'
import ram from 'random-access-memory'
import pump from 'pump'
import { P2WikiBackend } from '../dist/api.js'

ava('single-writer', async t => {
  const inst1 = new P2WikiBackend(ram)
  const wiki = await inst1.createWiki()

  await inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  
  await t.throwsAsync(() => inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', undefined))
  await inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')

  await inst1.delWikiDoc(wiki.key, 'HelloWorld')
  t.falsy(await inst1.getWikiDoc(wiki.key, 'HelloWorld'))

  await inst1.putWikiDoc(wiki.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listWikiDocHistory(wiki.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
})

ava('single-writer, remote read', async t => {
  const inst1 = new P2WikiBackend(ram)
  const inst2 = new P2WikiBackend(ram)
  connectBackends(inst1, inst2)
  const wiki = await inst1.createWiki()
  await inst2.addWiki(wiki.key.toString('hex'))

  await inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  const doc1rev1_2 = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, '# Hello World')
  
  await t.throwsAsync(() => inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', undefined))
  await inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')
  const doc1rev2_2 = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev2_2.key, 'HelloWorld')
  t.is(doc1rev2_2.value, '# Hello World!!')

  await inst1.delWikiDoc(wiki.key, 'HelloWorld')
  t.falsy(await inst1.getWikiDoc(wiki.key, 'HelloWorld'))
  t.falsy(await inst2.getWikiDoc(wiki.key, 'HelloWorld'))

  await inst1.putWikiDoc(wiki.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listWikiDocHistory(wiki.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
  const doc1history_2 = await inst2.listWikiDocHistory(wiki.key, 'HelloWorld')
  t.is(doc1history_2.length, 3)
  t.is(doc1history_2[0].value, '# Hello World')
  t.is(doc1history_2[1].value, '# Hello World!!')
  t.falsy(doc1history_2[2].value)
})

ava('dual-writer, connected', async t => {
  const inst1 = new P2WikiBackend(ram)
  const inst2 = new P2WikiBackend(ram)
  connectBackends(inst1, inst2)
  const wiki = await inst1.createWiki()
  await inst2.addWiki(wiki.key)

  // create a writer on inst2 and add it to inst1
  const remoteWikiInfo = await inst2.createWikiWriter(wiki.key)
  await inst1.addWikiWriter(wiki.key, remoteWikiInfo.writers.find(w => w.writable).key)

  await inst1.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', 0)
  
  const doc1rev1 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, '# Hello World')
  const doc1rev1_2 = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, '# Hello World')
  
  await t.throwsAsync(() => inst2.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World', undefined))
  await inst2.putWikiDoc(wiki.key, 'HelloWorld', '# Hello World!!', doc1rev1.seq)

  const doc1rev2 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev2.key, 'HelloWorld')
  t.is(doc1rev2.value, '# Hello World!!')
  const doc1rev2_2 = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev2_2.key, 'HelloWorld')
  t.is(doc1rev2_2.value, '# Hello World!!')

  await inst2.delWikiDoc(wiki.key, 'HelloWorld')
  t.falsy(await inst1.getWikiDoc(wiki.key, 'HelloWorld'))
  t.falsy(await inst2.getWikiDoc(wiki.key, 'HelloWorld'))

  await inst1.putWikiDoc(wiki.key, 'SecondDoc', 'Ignore me pls')

  const doc1history = await inst1.listWikiDocHistory(wiki.key, 'HelloWorld')
  t.is(doc1history.length, 3)
  t.is(doc1history[0].value, '# Hello World')
  t.is(doc1history[1].value, '# Hello World!!')
  t.falsy(doc1history[2].value)
  const doc1history_2 = await inst2.listWikiDocHistory(wiki.key, 'HelloWorld')
  t.is(doc1history_2.length, 3)
  t.is(doc1history_2[0].value, '# Hello World')
  t.is(doc1history_2[1].value, '# Hello World!!')
  t.falsy(doc1history_2[2].value)
})

ava('dual-writer, disconnected', async t => {
  const inst1 = new P2WikiBackend(ram)
  const inst2 = new P2WikiBackend(ram)
  connectBackends(inst1, inst2)
  const wiki = await inst1.createWiki()
  await inst2.addWiki(wiki.key)

  // create a writer on inst2 and add it to inst1
  const remoteWikiInfo = await inst2.createWikiWriter(wiki.key)
  await inst1.addWikiWriter(wiki.key, remoteWikiInfo.writers.find(w => w.writable).key)

  // now that they're paired, disconnect them
  disconnectBackends(inst1, inst2)

  await inst1.putWikiDoc(wiki.key, 'HelloWorld', 'writer1', 0)
  await inst2.putWikiDoc(wiki.key, 'HelloWorld', 'writer2', 0)
  
  const doc1rev1 = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1.key, 'HelloWorld')
  t.is(doc1rev1.value, 'writer1')
  const doc1rev1_2 = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.is(doc1rev1_2.key, 'HelloWorld')
  t.is(doc1rev1_2.value, 'writer2')

  // now reconnect them
  connectBackends(inst1, inst2)
  
  const doc1rev1Merged = await inst1.getWikiDoc(wiki.key, 'HelloWorld')
  const doc1rev1_2Merged = await inst2.getWikiDoc(wiki.key, 'HelloWorld')
  t.truthy(['writer1', 'writer2'].includes(doc1rev1Merged.value))
  t.truthy(['writer1', 'writer2'].includes(doc1rev1_2Merged.value))
  t.is(doc1rev1Merged.value, doc1rev1_2Merged.value)
  
  const doc1history = await inst1.listWikiDocHistory(wiki.key, 'HelloWorld')
  const doc1history_2 = await inst1.listWikiDocHistory(wiki.key, 'HelloWorld')
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