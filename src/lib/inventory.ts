// Tính toán tồn kho từ danh sách phiếu nhập (thu mua) và xuất (bán). Thuần hàm, không phụ thuộc giao diện.

export type Direction = 'nhap' | 'xuat'

export interface Material {
  code: string
  name: string
  group: 'Sắt' | 'Đồng' | 'Nhôm' | 'Inox' | 'Khác'
  minStockKg: number // dưới mức này thì cảnh báo
  color: string
}

export interface Txn {
  id: string
  date: string // YYYY-MM-DD
  direction: Direction
  material: string
  kg: number
  pricePerKg: number // đồng/kg
  partner: string
  plate: string
}

export interface Stock {
  material: string
  kg: number
  avgCost: number // giá vốn bình quân gia quyền, đồng/kg
  value: number
}

/** Tồn kho theo loại, giá vốn bình quân gia quyền di động. Xuất quá tồn thì ném lỗi. */
export function computeStock(txns: Txn[]): Map<string, Stock> {
  const out = new Map<string, Stock>()
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  for (const t of sorted) {
    const s = out.get(t.material) ?? { material: t.material, kg: 0, avgCost: 0, value: 0 }
    if (t.direction === 'nhap') {
      const value = s.kg * s.avgCost + t.kg * t.pricePerKg
      s.kg += t.kg
      s.avgCost = s.kg ? value / s.kg : 0
    } else {
      if (t.kg > s.kg + 1e-9) throw new Error(`Phiếu ${t.id}: xuất ${t.kg} kg nhưng chỉ còn ${s.kg} kg`)
      s.kg -= t.kg
    }
    s.value = s.kg * s.avgCost
    out.set(t.material, s)
  }
  return out
}

export interface DayFlow {
  date: string
  nhap: number
  xuat: number
}

/** Khối lượng nhập/xuất theo ngày trong `days` ngày tính tới `until`, ngày không có giao dịch = 0. */
export function dailyFlow(txns: Txn[], until: string, days: number): DayFlow[] {
  const end = new Date(until + 'T00:00:00Z')
  const rows: DayFlow[] = []
  const index = new Map<string, DayFlow>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000).toISOString().slice(0, 10)
    const row = { date: d, nhap: 0, xuat: 0 }
    rows.push(row)
    index.set(d, row)
  }
  for (const t of txns) {
    const row = index.get(t.date)
    if (row) row[t.direction] += t.kg
  }
  return rows
}

export interface Kpis {
  stockKg: number
  stockValue: number
  boughtKg: number
  soldKg: number
  revenue: number
  grossMargin: number // lãi gộp ước tính trên hàng đã bán, theo giá vốn bình quân
}

/** Chỉ số tổng hợp trong khoảng [from, until]. */
export function kpis(txns: Txn[], from: string, until: string): Kpis {
  const stock = computeStock(txns.filter((t) => t.date <= until))
  let boughtKg = 0, soldKg = 0, revenue = 0, cogs = 0
  // giá vốn tại thời điểm bán: chạy lại tuần tự để lấy avgCost ngay trước mỗi phiếu xuất
  const running = new Map<string, { kg: number; avg: number }>()
  const sorted = [...txns].filter((t) => t.date <= until).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  for (const t of sorted) {
    const r = running.get(t.material) ?? { kg: 0, avg: 0 }
    const inRange = t.date >= from
    if (t.direction === 'nhap') {
      r.avg = (r.kg * r.avg + t.kg * t.pricePerKg) / (r.kg + t.kg)
      r.kg += t.kg
      if (inRange) boughtKg += t.kg
    } else {
      r.kg -= t.kg
      if (inRange) {
        soldKg += t.kg
        revenue += t.kg * t.pricePerKg
        cogs += t.kg * r.avg
      }
    }
    running.set(t.material, r)
  }
  let stockKg = 0, stockValue = 0
  for (const s of stock.values()) {
    stockKg += s.kg
    stockValue += s.value
  }
  return { stockKg, stockValue, boughtKg, soldKg, revenue, grossMargin: revenue - cogs }
}

export function lowStock(stock: Map<string, Stock>, materials: Material[]): Material[] {
  return materials.filter((m) => (stock.get(m.code)?.kg ?? 0) < m.minStockKg)
}

export const vnd = (n: number) => Math.round(n).toLocaleString('vi-VN')
export const tons = (kg: number) => (kg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })
