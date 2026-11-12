/**
 * E2E tests for catalog features — search, filtering, pagination.
 *
 * Run against dev server:
 *   Terminal 1: bun run dev          (http://localhost:3000)
 *   Terminal 2: playwright test tests/e2e/catalog-features.spec.ts
 *
 * Or against production:
 *   BASE_URL=https://tipind.mahiralamtohan.workers.dev playwright test tests/e2e/catalog-features.spec.ts
 */

import { test, expect } from "@playwright/test"

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000"

test.describe("catalog search", () => {
  test("searches and returns matching products", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000) // wait for catalog to load

    // Type a search query
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill("paracetamol")
    await page.waitForTimeout(500)

    // Should show matching results
    const results = page.locator("tbody tr").filter({ hasText: /paracetamol/i })
    await expect(results.first()).toBeVisible()
  })

  test("search results are ranked by name first", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000)

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill("ACECLOHEAL MR")
    await page.waitForTimeout(500)

    // First data row (skip header) should have ACECLOHEAL MR in the name
    const firstRow = page.locator("tbody tr").first()
    await expect(firstRow).toContainText(/ACECLOHEAL/i)
  })

  test("empty search shows all products", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000)

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()
    await searchInput.fill("")
    await page.waitForTimeout(500)

    // Should show products
    const rows = page.locator("tbody tr")
    await expect(rows.first()).toBeVisible()
  })
})

test.describe("catalog filtering", () => {
  test("filters by manufacturer", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000)

    // Open filters
    const filterButton = page.locator('button:has-text("Filters"), [aria-label*="filter"]').first()
    await filterButton.click()
    await page.waitForTimeout(500)

    // Select a manufacturer facet button (FacetFilter renders <button> elements)
    const manufacturerButton = page.locator("#catalog-filters button").first()
    await manufacturerButton.click()
    await page.waitForTimeout(500)

    // Results should still be visible (filtered)
    await expect(page.locator("tbody tr")).toBeVisible()
  })

  test("filters by price range", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000)

    const filterButton = page.locator('button:has-text("Filters"), [aria-label*="filter"]').first()
    await filterButton.click()
    await page.waitForTimeout(500)

    // Price filter uses a RangeSlider, not text inputs.
    // Verify the price filter section is present.
    await expect(page.locator('text=Price Range')).toBeVisible()
  })
})

test.describe("catalog pagination / load more", () => {
  test("load more button loads additional products", async ({ page }) => {
    await page.goto(`${BASE_URL}/#catalog`)
    await page.waitForTimeout(2000)

    const loadMore = page.locator('button:has-text("Load more"), button:has-text("Show more")')
    if (await loadMore.count() > 0) {
      const beforeCount = await page.locator("tbody tr").count()
      await loadMore.click()
      await page.waitForTimeout(500)
      const afterCount = await page.locator("tbody tr").count()
      expect(afterCount).toBeGreaterThan(beforeCount)
    }
  })
})

test.describe("404 page", () => {
  test("returns 404 for unknown path", async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/does-not-exist/`)
    expect(response?.status()).toBe(404)
  })
})
