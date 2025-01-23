import { MongoDbConnection } from "@js-soft/docdb-access-mongo"
import fs from "fs"
import { table } from "table"
import { Timings, bench } from "./bench.js"
import { fill } from "./fill.js"

const dbName = "acc1"
const collectionName = "c"

const ferretV1 = new MongoDbConnection("mongodb://localhost:27018")
await ferretV1.connect()
const ferretV1Db = await ferretV1.getDatabase(dbName)
const ferretV1Collection = await ferretV1Db.getCollection(collectionName)

const ferretV2 = new MongoDbConnection("mongodb://username:password@localhost:27017")
await ferretV2.connect()
const ferretV2Db = await ferretV2.getDatabase(dbName)
const ferretV2Collection = await ferretV2Db.getCollection(collectionName)

const mongodb = new MongoDbConnection("mongodb://root:example@localhost:27019")
await mongodb.connect()
const mongodbDb = await mongodb.getDatabase(dbName)
const mongodbCollection = await mongodbDb.getCollection(collectionName)

const iterations = 20
const numberOfDocsPerIteration = 1000

const timings: Record<number, Timings> = {}

for (let i = 0; i < iterations; i++) {
  await fill(numberOfDocsPerIteration, ferretV1Collection)
  await fill(numberOfDocsPerIteration, ferretV2Collection)
  await fill(numberOfDocsPerIteration, mongodbCollection)

  const count = await mongodbCollection.count()

  const randomFerretV1Peer = (await ferretV1Collection.findOne()).peer.address
  const ferretV1Results = await bench(
    `ferretV1 with ${count} docs`,
    async () => await ferretV1Collection.find({ "peer.address": randomFerretV1Peer }),
    10
  )

  const randomFerretV2Peer = (await ferretV2Collection.findOne()).peer.address
  const ferretV2Results = await bench(
    `ferret with ${count} docs`,
    async () => await ferretV2Collection.find({ "peer.address": randomFerretV2Peer }),
    10
  )

  const randomNativePeer = (await ferretV2Collection.findOne()).peer.address
  const nativeResults = await bench(
    `native with ${count} docs`,
    async () => await mongodbCollection.find({ "peer.address": randomNativePeer }),
    10
  )

  timings[count] = { ferretV1: ferretV1Results, ferretV2: ferretV2Results, native: nativeResults }

  console.log("------------------------------------------------------------")
}

console.log(
  table([
    ["DB /\nCount", "FerretDB V1", "FerretDB V2", "Native"],
    ...Object.entries(timings).map(([count, { ferretV1, ferretV2, native }]) => [
      count,
      `min: ${ferretV1.min.toFixed(2)}ms\nmax: ${ferretV1.max.toFixed(2)}ms\navg: ${ferretV1.avg.toFixed(2)}ms`,
      `min: ${ferretV2.min.toFixed(2)}ms\nmax: ${ferretV2.max.toFixed(2)}ms\navg: ${ferretV2.avg.toFixed(2)}ms`,
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
        `${num};${nf.format(timing.ferretV1.avg)};${nf.format(timing.ferretV2.avg)};${nf.format(timing.native.avg)}`
    )
    .join("\n")
)
fs.writeFileSync("timings.json", JSON.stringify(timings, null, 2))

process.exit()
