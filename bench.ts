import chalk from "chalk"

type Timing = { min: number; max: number; avg: number }

export type Timings = { ferret: Timing; native: Timing }

export async function bench(name: string, fn: () => Promise<void>, count: number): Promise<Timing> {
  const results = []

  for (let i = 0; i < count; i++) {
    const start = process.hrtime()
    await fn()
    const end = process.hrtime(start)
    const elapsed = end[0] * 1000 + end[1] / 1000000
    results.push(elapsed)
  }

  const min = Math.min(...results)
  const max = Math.max(...results)
  const avg = results.reduce((a, b) => a + b) / results.length

  const nf = new Intl.NumberFormat()

  const minString = chalk.green(`min: ${nf.format(min)}ms`)
  const maxString = chalk.red(`max: ${nf.format(max)}ms`)
  const avgString = chalk.yellow(`avg: ${nf.format(avg)}ms`)
  console.log(`${chalk.gray(name)}: ${minString} - ${maxString} - ${avgString}`)

  return { min, max, avg }
}
