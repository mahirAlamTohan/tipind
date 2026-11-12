declare module "bun:test" {
  export function describe(name: string, fn: () => void): void
  export function test(name: string, fn: () => void | Promise<void>): void
  export function expect(actual: unknown): {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toBeGreaterThan(expected: number): void
    toBeGreaterThanOrEqual(expected: number): void
    toBeInstanceOf(expected: unknown): void
    toHaveLength(expected: number): void
    toBeUndefined(): void
    toBeTruthy(): void
    toContain(expected: string): void
    toMatch(expected: RegExp | string): void
    not: {
      toBe(expected: unknown): void
      toEqual(expected: unknown): void
      toHaveLength(expected: number): void
    }
  }
  export function beforeEach(fn: () => void | Promise<void>): void
  export function afterEach(fn: () => void | Promise<void>): void
}
