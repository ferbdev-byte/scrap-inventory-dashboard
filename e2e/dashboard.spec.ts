import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FIXTURE = fileURLToPath(new URL('./fixtures/phieu-mau.jsonl', import.meta.url))
const countLabel = (page: import('@playwright/test').Page) => page.getByText(/Phiếu cân 30 ngày · \d+ phiếu/)
const count = async (page: import('@playwright/test').Page) => Number((await countLabel(page).innerText()).match(/(\d+) phiếu/)![1])

// Lỗi JS trên trang làm test thất bại, kể cả khi giao diện trông vẫn đúng
let pageErrors: string[] = []

test.beforeEach(async ({ page }) => {
  pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tổng quan tồn kho' })).toBeVisible()
})

test.afterEach(() => {
  expect(pageErrors).toEqual([])
})

test('hiện KPI và biểu đồ (tải lười)', async ({ page }) => {
  await expect(page.getByText('Tồn kho hiện tại')).toBeVisible()
  await expect(page.getByText('Giá trị tồn theo loại (triệu đ)')).toBeVisible()
  await expect(page.locator('.recharts-surface').first()).toBeVisible()
})

test('nhập phiếu cân từ file: thêm phiếu hợp lệ, báo dòng lỗi', async ({ page }) => {
  const before = await count(page)
  await page.locator('input[type=file]').setInputFiles(FIXTURE)
  const notice = page.locator('div.mb-4[role=status]')
  await expect(notice).toContainText('Đã nhập 2 phiếu')
  await expect(notice).toContainText('không nhận ra loại hàng "vàng"')
  await expect.poll(() => count(page)).toBe(before + 2)
})

test('kéo thả file vào trang để nhập', async ({ page }) => {
  const text = readFileSync(FIXTURE, 'utf-8')
  const fire = (type: string) =>
    page.evaluate(([t, ty]) => {
      const dt = new DataTransfer()
      dt.items.add(new File([t], 'phieu.jsonl', { type: 'application/x-ndjson' }))
      window.dispatchEvent(new DragEvent(ty, { dataTransfer: dt, bubbles: true, cancelable: true }))
    }, [text, type])
  await fire('dragenter')
  await expect(page.getByText('Thả file phiếu cân để nhập')).toBeVisible()
  await fire('drop')
  await expect(page.getByText('Thả file phiếu cân để nhập')).toBeHidden()
  await expect(page.locator('div.mb-4[role=status]')).toContainText('Đã nhập 2 phiếu')
})

test('lọc và tìm kiếm phiếu', async ({ page }) => {
  const all = await count(page)
  await page.getByRole('combobox').selectOption('xuat')
  const sold = await count(page)
  expect(sold).toBeGreaterThan(0)
  expect(sold).toBeLessThan(all)
  await page.getByPlaceholder('Biển số, đối tác, loại…').fill('không-có-phiếu-này')
  await expect(page.getByText('Không có phiếu nào khớp.')).toBeVisible()
})

test('xuất CSV có BOM và đủ dòng', async ({ page }) => {
  const rows = await count(page)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'CSV' }).click()
  const file = await (await download).path()
  const raw = readFileSync(file!)
  expect([...raw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  expect(raw.toString('utf-8').trim().split('\r\n')).toHaveLength(rows + 1)
})

test('đổi giao diện sáng/tối và nhớ sau khi tải lại', async ({ page }) => {
  const html = page.locator('html')
  const start = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: 'Đổi giao diện sáng / tối' }).click()
  const next = start === 'dark' ? 'light' : 'dark'
  await expect(html).toHaveAttribute('data-theme', next)
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', next)
})

test('không tràn ngang trên mọi kích thước màn hình', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  expect(overflow).toBe(false)
})

test('có thẻ Open Graph để chia sẻ link hiện ảnh xem trước', async ({ page, request }) => {
  const og = (prop: string) => page.locator(`meta[property="${prop}"]`).getAttribute('content')
  expect(await og('og:title')).toContain('Scrap Inventory Dashboard')
  const image = await og('og:image')
  expect(image).toMatch(/^https:\/\/.+\/og\.png$/)
  const local = await request.get('og.png')
  expect(local.ok()).toBe(true)
  expect(local.headers()['content-type']).toContain('image/png')
})
