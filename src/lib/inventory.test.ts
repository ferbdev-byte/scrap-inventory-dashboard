import { describe, expect, it } from 'vitest'
import { computeStock, dailyFlow, kpis, lowStock, type Txn } from './inventory'
import { MATERIALS, sampleTxns } from './sample'

const t = (id: string, date: string, direction: 'nhap' | 'xuat', kg: number, pricePerKg: number, material = 'sat-dac'): Txn =>
  ({ id, date, direction, material, kg, pricePerKg, partner: '', plate: '' })

describe('computeStock', () => {
  it('tính giá vốn bình quân gia quyền', () => {
    const s = computeStock([t('1', '2026-11-01', 'nhap', 1000, 9000), t('2', '2026-11-02', 'nhap', 3000, 10000)]).get('sat-dac')!
    expect(s.kg).toBe(4000)
    expect(s.avgCost).toBe(9750)
    expect(s.value).toBe(39_000_000)
  })

  it('xuất không đổi giá vốn, chỉ giảm tồn', () => {
    const s = computeStock([t('1', '2026-11-01', 'nhap', 4000, 9750), t('2', '2026-11-03', 'xuat', 1500, 11000)]).get('sat-dac')!
    expect(s.kg).toBe(2500)
    expect(s.avgCost).toBe(9750)
  })

  it('báo lỗi khi xuất quá tồn', () => {
    expect(() => computeStock([t('1', '2026-11-01', 'nhap', 100, 1), t('2', '2026-11-02', 'xuat', 101, 1)])).toThrow(/chỉ còn/)
  })

  it('xử lý đúng thứ tự ngày dù danh sách bị xáo', () => {
    const s = computeStock([t('2', '2026-11-02', 'xuat', 50, 1), t('1', '2026-11-01', 'nhap', 100, 1)]).get('sat-dac')!
    expect(s.kg).toBe(50)
  })
})

describe('dailyFlow', () => {
  it('đủ số ngày, ngày trống bằng 0', () => {
    const rows = dailyFlow([t('1', '2026-11-22', 'nhap', 500, 1), t('2', '2026-11-22', 'xuat', 200, 1)], '2026-11-23', 3)
    expect(rows.map((r) => r.date)).toEqual(['2026-11-21', '2026-11-22', '2026-11-23'])
    expect(rows[1]).toMatchObject({ nhap: 500, xuat: 200 })
    expect(rows[0]).toMatchObject({ nhap: 0, xuat: 0 })
  })
})

describe('kpis', () => {
  it('lãi gộp = doanh thu − giá vốn bình quân tại thời điểm bán', () => {
    const k = kpis([t('1', '2026-11-01', 'nhap', 1000, 9000), t('2', '2026-11-02', 'xuat', 400, 10000)], '2026-11-01', '2026-11-30')
    expect(k.revenue).toBe(4_000_000)
    expect(k.grossMargin).toBe(400_000)
    expect(k.stockKg).toBe(600)
  })
})

describe('dữ liệu mẫu', () => {
  it('ổn định và không bao giờ xuất quá tồn', () => {
    const a = sampleTxns()
    expect(sampleTxns()).toEqual(a)
    expect(a.length).toBeGreaterThan(150)
    expect(() => computeStock(a)).not.toThrow()
  })

  it('cảnh báo tồn thấp theo ngưỡng từng loại', () => {
    const stock = computeStock([t('1', '2026-11-01', 'nhap', 25_000, 9000)])
    const low = lowStock(stock, MATERIALS).map((m) => m.code)
    expect(low).not.toContain('sat-dac')
    expect(low).toContain('dong-cap')
  })
})
