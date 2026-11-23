// Dữ liệu mẫu sinh ngẫu nhiên có hạt giống cố định: mỗi lần mở trang đều ra cùng một bộ số.
// KHÔNG phải số liệu kinh doanh thật.
import type { Material, Txn } from './inventory'

export const MATERIALS: Material[] = [
  { code: 'sat-dac', name: 'Sắt đặc', group: 'Sắt', minStockKg: 20_000, color: '#94a3b8' },
  { code: 'sat-vun', name: 'Sắt vụn', group: 'Sắt', minStockKg: 30_000, color: '#64748b' },
  { code: 'dong-cap', name: 'Đồng cáp', group: 'Đồng', minStockKg: 800, color: '#f59e0b' },
  { code: 'dong-vang', name: 'Đồng vàng', group: 'Đồng', minStockKg: 500, color: '#eab308' },
  { code: 'nhom-dac', name: 'Nhôm đặc', group: 'Nhôm', minStockKg: 3_000, color: '#38bdf8' },
  { code: 'nhom-lon', name: 'Nhôm lon', group: 'Nhôm', minStockKg: 1_500, color: '#7dd3fc' },
  { code: 'inox-304', name: 'Inox 304', group: 'Inox', minStockKg: 4_000, color: '#a78bfa' },
  { code: 'giay-carton', name: 'Giấy carton', group: 'Khác', minStockKg: 5_000, color: '#a3a380' },
]

const BASE_PRICE: Record<string, number> = {
  'sat-dac': 9_200, 'sat-vun': 7_800, 'dong-cap': 178_000, 'dong-vang': 112_000,
  'nhom-dac': 48_000, 'nhom-lon': 31_000, 'inox-304': 32_000, 'giay-carton': 3_200,
}
const LOT_KG: Record<string, [number, number]> = {
  'sat-dac': [1_500, 9_000], 'sat-vun': [2_000, 14_000], 'dong-cap': [40, 420], 'dong-vang': [30, 260],
  'nhom-dac': [150, 1_400], 'nhom-lon': [80, 700], 'inox-304': [200, 1_800], 'giay-carton': [300, 2_500],
}
const SELLERS = ['Vựa Mẫu A', 'Cơ khí Mẫu B', 'Xưởng Mẫu C', 'Công trình Mẫu D', 'Khách lẻ']
const BUYERS = ['Nhà máy thép Mẫu', 'Nhà máy đúc Mẫu', 'Công ty tái chế Mẫu']

function rng(seed: number) {
  return () => {
    seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296
    return seed / 4_294_967_296
  }
}

export function sampleTxns(until = '2026-11-23', days = 60, seed = 2026): Txn[] {
  const r = rng(seed)
  const end = new Date(until + 'T00:00:00Z').getTime()
  const stock: Record<string, number> = {}
  const txns: Txn[] = []
  let n = 1
  const plate = () => `${50 + Math.floor(r() * 30)}C-${100 + Math.floor(r() * 900)}.${10 + Math.floor(r() * 89)}`
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(end - i * 86_400_000)
    if (day.getUTCDay() === 0) continue // nghỉ Chủ nhật
    const date = day.toISOString().slice(0, 10)
    const drift = 1 + 0.04 * Math.sin((days - i) / 9)
    const buys = 3 + Math.floor(r() * 5)
    for (let k = 0; k < buys; k++) {
      const m = MATERIALS[Math.floor(r() * MATERIALS.length)].code
      const [lo, hi] = LOT_KG[m]
      const kg = Math.round((lo + r() * (hi - lo)) / 10) * 10
      const price = Math.round((BASE_PRICE[m] * drift * (0.97 + r() * 0.06)) / 100) * 100
      txns.push({ id: `N${String(n++).padStart(4, '0')}`, date, direction: 'nhap', material: m, kg, pricePerKg: price,
        partner: SELLERS[Math.floor(r() * SELLERS.length)], plate: plate() })
      stock[m] = (stock[m] ?? 0) + kg
    }
    if (r() < 0.55) {
      // bán lô lớn cho nhà máy, giá bán cao hơn giá mua 6–12%
      const m = MATERIALS[Math.floor(r() * MATERIALS.length)].code
      const kg = Math.round(((stock[m] ?? 0) * (0.5 + r() * 0.4)) / 10) * 10
      if (kg > 0) {
        const price = Math.round((BASE_PRICE[m] * drift * (1.06 + r() * 0.06)) / 100) * 100
        txns.push({ id: `X${String(n++).padStart(4, '0')}`, date, direction: 'xuat', material: m, kg, pricePerKg: price,
          partner: BUYERS[Math.floor(r() * BUYERS.length)], plate: plate() })
        stock[m] -= kg
      }
    }
  }
  return txns
}
