import { MongoDbConnection } from "@js-soft/docdb-access-mongo"
import fs from "fs"
import { table } from "table"
import { Timings, bench } from "./bench.js"
import { fill } from "./fill.js"

const dbName = "acc1"
const collectionName = "c"

const ferret = new MongoDbConnection("mongodb://localhost:27017")
await ferret.connect()
const ferretDb = await ferret.getDatabase(dbName)
const ferretCollection = await ferretDb.getCollection(collectionName)

const mongodb = new MongoDbConnection("mongodb://root:example@localhost:27019")
await mongodb.connect()
const mongodbDb = await mongodb.getDatabase(dbName)
const mongodbCollection = await mongodbDb.getCollection(collectionName)

const iterations = 20
const numberOfDocsPerIteration = 1000

const timings: Record<number, Timings> = {}

for (let i = 0; i < iterations; i++) {
  await fill(numberOfDocsPerIteration, ferretCollection)
  await fill(numberOfDocsPerIteration, mongodbCollection)

  const randomFerretPeer = (await ferretCollection.findOne()).peer.address
  const count = await ferretCollection.count()

  const ferretResults = await bench(
    `ferret with ${count} docs`,
    async () => await ferretCollection.find({ "peer.address": randomFerretPeer }),
    10
  )

  const randomNativePeer = (await ferretCollection.findOne()).peer.address
  const nativeResults = await bench(
    `native with ${count} docs`,
    async () => await mongodbCollection.find({ "peer.address": randomNativePeer }),
    10
  )

  timings[count] = { ferret: ferretResults, native: nativeResults }

  console.log("------------------------------------------------------------")
}

console.log(
  table([
    ["Pushdown /\nCount", "Enabled", "Disabled", "Native"],
    ...Object.entries(timings).map(([count, { ferret, native }]) => [
      count,
      `min: ${ferret.min.toFixed(2)}ms\nmax: ${ferret.max.toFixed(2)}ms\navg: ${ferret.avg.toFixed(2)}ms`,
      `min: ${native.min.toFixed(2)}ms\nmax: ${native.max.toFixed(2)}ms\navg: ${native.avg.toFixed(2)}ms`,
    ]),
  ])
)

const nf = new Intl.NumberFormat()
fs.writeFileSync(
  "timings.csv",
  Object.entries(timings)
    .map(([num, timing]) => `${num};${nf.format(timing.ferret.avg)};${nf.format(timing.native.avg)}`)
    .join("\n")
)
fs.writeFileSync("timings.json", JSON.stringify(timings, null, 2))

process.exit()
