import { MongoDbConnection } from "@js-soft/docdb-access-mongo"
import { table } from "table"
import { Timings, bench } from "./bench.js"
import { fill } from "./fill.js"

const dbName = "acc1"
const collectionName = "c"

const fast = new MongoDbConnection("mongodb://root:example@localhost:27019")

await fast.connect()
const fastDb = await fast.getDatabase(dbName)
const fastCollection = await fastDb.getCollection(collectionName)

const slow = new MongoDbConnection("mongodb://localhost:27018")
await slow.connect()
const slowDb = await slow.getDatabase(dbName)
const slowCollection = await slowDb.getCollection(collectionName)

const timings: Record<number, Timings> = {}

for (let i = 0; i < 1; i++) {
  await fill(23861, fastCollection)

  const randomPeer = (await fastCollection.findOne()).peer.address
  const count = await fastCollection.count()

  const fast = await bench(
    `fast with ${count} docs`,
    async () => await fastCollection.find({ "peer.address": randomPeer }),
    10
  )

  const slow = await bench(
    `slow with ${count} docs`,
    async () => await slowCollection.find({ "peer.address": randomPeer }),
    10
  )

  timings[count] = { fast, slow }

  console.log("------------------------------------------------------------")
}

console.log(
  table([
    ["Pushdown /\nCount", "Enabled", "Disabled"],
    ...Object.entries(timings).map(([count, { fast, slow }]) => [
      count,
      `min: ${fast.min.toFixed(2)}ms\nmax: ${fast.max.toFixed(2)}ms\navg: ${fast.avg.toFixed(2)}ms`,
      `min: ${slow.min.toFixed(2)}ms\nmax: ${slow.max.toFixed(2)}ms\navg: ${slow.avg.toFixed(2)}ms`,
    ]),
  ])
)

process.exit()
