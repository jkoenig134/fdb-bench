import chalk from "chalk"

type Timing = { min: number; max: number; avg: number }

export type Timings = { fast: Timing; slow: Timing }

export async function bench(name: string, fn: () => Promise<void>, count: number): Promise<Timing> {
  const results = []

  for (let i = 0; i < count; i++) {
    const elapsed = await _benchSingle(fn)
    results.push(elapsed)
  }

  const min = Math.min(...results)
  const max = Math.max(...results)
  const avg = results.reduce((a, b) => a + b) / results.length

  const nf = new Intl.NumberFormat()

  console.log(
    `${chalk.gray(name)}: ` +
      `${chalk.green(`min: ${nf.format(min)}ms`)} - ` +
      `${chalk.red(`max: ${nf.format(max)}ms`)} - ` +
      `${chalk.yellow(`avg: ${nf.format(avg)}ms`)}`
  )

  return { min, max, avg }
}

async function _benchSingle(fn: () => Promise<void>): Promise<number> {
  const start = process.hrtime()
  await fn()
  const elapsed = process.hrtime(start)[1] / 1000000

  return elapsed
}
