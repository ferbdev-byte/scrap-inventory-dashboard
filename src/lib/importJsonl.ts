// Nhập phiếu cân từ file JSON Lines do weighbridge-reader ghi ra (mỗi dòng một xe).
import type { Material, Txn } from './inventory'

export interface ImportResult {
  txns: Txn[]
  errors: string[]
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

/** Tìm mã loại hàng theo tên viết tự do: "Sắt vụn loại 2" → sat-vun. */
export function matchMaterial(name: string, materials: Material[]): string | null {
  const n = fold(name)
  if (!n) return null
  const exact = materials.find((m) => m.code === n || fold(m.name) === n)
  if (exact) return exact.code
  const partial = materials
    .filter((m) => n.includes(fold(m.name)))
    .sort((a, b) => b.name.length - a.name.length)
  return partial[0]?.code ?? null
}

/**
 * Mỗi dòng: { plate, material, gross_kg, tare_kg, impurity_pct, unit_price, times: { lan_2 } , direction? }.
 * Khối lượng tính tiền = (tổng − bì) − tạp chất. Mặc định là phiếu thu mua (nhập kho).
 */
export function parseJsonl(text: string, materials: Material[], idPrefix = 'IMP'): ImportResult {
  const txns: Txn[] = []
  const errors: string[] = []
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return
    const row = i + 1
    let r: Record<string, unknown>
    try {
      r = JSON.parse(line)
    } catch {
      errors.push(`Dòng ${row}: không phải JSON hợp lệ`)
      return
    }
    const gross = Number(r.gross_kg)
    const tare = Number(r.tare_kg)
    if (!Number.isFinite(gross) || !Number.isFinite(tare)) {
      errors.push(`Dòng ${row}: thiếu gross_kg hoặc tare_kg`)
      return
    }
    const material = matchMaterial(String(r.material ?? ''), materials)
    if (!material) {
      errors.push(`Dòng ${row}: không nhận ra loại hàng "${String(r.material ?? '')}"`)
      return
    }
    const net = Math.abs(gross - tare)
    const kg = Math.round(net - (net * Number(r.impurity_pct ?? 0)) / 100)
    const price = Number(r.unit_price ?? 0)
    if (kg <= 0 || price <= 0) {
      errors.push(`Dòng ${row}: khối lượng hoặc đơn giá phải lớn hơn 0`)
      return
    }
    const times = (r.times ?? {}) as Record<string, string>
    const date = (times.lan_2 ?? times.lan_1 ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Dòng ${row}: thiếu ngày cân (times.lan_2)`)
      return
    }
    txns.push({
      id: `${idPrefix}${String(row).padStart(4, '0')}`,
      date,
      direction: r.direction === 'xuat' ? 'xuat' : 'nhap',
      material,
      kg,
      pricePerKg: price,
      partner: String(r.partner ?? 'Nhập từ file'),
      plate: String(r.plate ?? ''),
    })
  })
  return { txns, errors }
}
