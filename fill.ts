import { MongoDbCollection } from "@js-soft/docdb-access-mongo"
import { CoreIdHelper, Random } from "@nmshd/transport"
import chalk from "chalk"
import cliProgress from "cli-progress"
import pLimit from "p-limit"

export async function fill(name: string, count: number, collection: MongoDbCollection): Promise<void> {
  console.log(`filling ${chalk.bold(name)}`)

  const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
  bar1.start(count, 0)

  const worker = pLimit(10)
  const promises = Array.from({ length: count }).map(() =>
    worker(async () => {
      const timings = await insertDocument(collection)
      bar1.increment()
      return timings
    })
  )

  const results = await Promise.all(promises)
  bar1.stop()

  const min = Math.min(...results)
  const max = Math.max(...results)
  const avg = results.reduce((a, b) => a + b) / results.length

  const nf = new Intl.NumberFormat()

  console.log(
    `${chalk.gray(`create ${count} documents`)}: ` +
      `${chalk.green(`min: ${nf.format(min)}ms`)} - ` +
      `${chalk.red(`max: ${nf.format(max)}ms`)} - ` +
      `${chalk.yellow(`avg: ${nf.format(avg)}ms`)}`
  )
}

async function insertDocument(collection: MongoDbCollection): Promise<number> {
  const relId = (await new CoreIdHelper("REL").generate()).toString()
  const peerAddress = await Random.string(20)

  const rel = {
    "@type": "Relationship",
    cache: {
      changes: [
        {
          id: "RCHL1zfYc6Hzctq6OTEe",
          relationshipId: relId,
          request: {
            content: {},
            createdAt: "2024-02-07T19:51:59.487Z",
            createdBy: peerAddress,
            createdByDevice: "DVCKMKWUiU4QCGpiNGk2",
          },
          response: {
            content: {},
            createdAt: "2024-02-07T19:53:19.073Z",
            createdBy: "id12jGFTeupP5w8YnahMv4EtXg4dMtBY3ouh",
            createdByDevice: "DVC36519gGBX89oSpB8R",
          },
          status: "Accepted",
          type: "Creation",
        },
      ],
      template: {
        cache: {
          content: {},
          createdAt: "2024-02-07T19:49:05.974Z",
          createdBy: "id12jGFTeupP5w8YnahMv4EtXg4dMtBY3ouh",
          createdByDevice: "DVC36519gGBX89oSpB8R",
          expiresAt: "2025-01-01T00:00:00.000Z",
          identity: {
            address: "id12jGFTeupP5w8YnahMv4EtXg4dMtBY3ouh",
            publicKey: {
              pub: "A8ZgjyIYaQ9XMU9IB7hxYY10o5-nTt4HGeEU_GzlLho",
              alg: 3,
              "@type": undefined,
            },
            realm: "id1",
          },
          templateKey: {
            id: "TRPRTKsFoG4FBzFxqB6Z",
            pub: "Fux3naBorvJ0zXsbEqraamtfjW0pGhccIFkzdja2eS8",
            alg: 3,
            "@type": undefined,
          },
        },
        cachedAt: "2024-02-07T19:49:05.987Z",
        id: "RLTuquejws63YSjC31cn",
        isOwn: true,
        secretKey: {
          key: "2ouJxKWjXGESJwHprg2f-dFTm_L8U3v0acVBMK13u9A",
          alg: 3,
          "@type": undefined,
        },
      },
    },
    cachedAt: "2024-02-07T19:53:18.819Z",
    id: relId,
    peer: {
      address: peerAddress,
      publicKey: {
        pub: "eWc9PkNjT405VLxejK0BeMaHih59avTSHs5JCq4-S7g",
        alg: 3,
      },
      realm: "id1",
    },
    relationshipSecretId: "TRPRSEWB3on0pIjwFTnU",
    status: "Active",
    templateId: "RLTuquejws63YSjC31cn",
  }

  const start = process.hrtime()

  await collection.create(rel)

  const elapsed = process.hrtime(start)[1] / 1000000
  return elapsed
}
