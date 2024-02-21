import { MongoDbConnection } from "@js-soft/docdb-access-mongo"
import fs from "fs"
import { table } from "table"
import { Timings, bench } from "./bench.js"
import { fill } from "./fill.js"

const dbName = "acc1"
const collectionName = "c"

const fast = new MongoDbConnection("mongodb://localhost:27017")
await fast.connect()
const fastDb = await fast.getDatabase(dbName)
const fastCollection = await fastDb.getCollection(collectionName)

const slow = new MongoDbConnection("mongodb://localhost:27018")
await slow.connect()
const slowDb = await slow.getDatabase(dbName)
const slowCollection = await slowDb.getCollection(collectionName)

const mongodb = new MongoDbConnection("mongodb://root:example@localhost:27019")
await mongodb.connect()
const mongodbDb = await mongodb.getDatabase(dbName)
const mongodbCollection = await mongodbDb.getCollection(collectionName)

const timings: Record<number, Timings> = {}

for (let i = 0; i < 20; i++) {
  await fill(1000, fastCollection)
  await fill(1000, mongodbCollection)

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
    3
  )

  const native = await bench(
    `native with ${count} docs`,
    async () => await mongodbCollection.find({ "peer.address": randomPeer }),
    10
  )

  timings[count] = { fast, slow, native }

  console.log("------------------------------------------------------------")
}

console.log(
  table([
    ["Pushdown /\nCount", "Enabled", "Disabled", "Native"],
    ...Object.entries(timings).map(([count, { fast, slow, native }]) => [
      count,
      `min: ${fast.min.toFixed(2)}ms\nmax: ${fast.max.toFixed(2)}ms\navg: ${fast.avg.toFixed(2)}ms`,
      `min: ${slow.min.toFixed(2)}ms\nmax: ${slow.max.toFixed(2)}ms\navg: ${slow.avg.toFixed(2)}ms`,
      `min: ${native.min.toFixed(2)}ms\nmax: ${native.max.toFixed(2)}ms\navg: ${native.avg.toFixed(2)}ms`,
    ]),
  ])
)

const nf = new Intl.NumberFormat()
fs.writeFileSync(
  "timings.csv",
  Object.entries(timings)
    .map(
      ([num, timing]) =>
        `${num};${nf.format(timing.fast.avg)};${nf.format(timing.slow.avg)};${nf.format(timing.native.avg)}`
    )
    .join("\n")
)
fs.writeFileSync("timings.json", JSON.stringify(timings, null, 2))

process.exit()
