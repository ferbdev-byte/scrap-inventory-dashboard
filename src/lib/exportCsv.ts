// Xuất danh sách phiếu ra CSV mở được bằng Excel (UTF-8 có BOM để giữ dấu tiếng Việt).
import type { Material, Txn } from './inventory'

const HEADER = ['Số phiếu', 'Ngày', 'Loại phiếu', 'Loại hàng', 'Đối tác', 'Biển số', 'Khối lượng (kg)', 'Đơn giá (đ/kg)', 'Thành tiền (đ)']

/** Bọc ô theo RFC 4180, và chặn công thức Excel (CSV injection) ở ô bắt đầu bằng = + - @. */
export function cell(v: string | number): string {
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(txns: Txn[], materials: Material[]): string {
  const name = Object.fromEntries(materials.map((m) => [m.code, m.name]))
  const rows = txns.map((t) => [
    t.id,
    t.date.split('-').reverse().join('/'),
    t.direction === 'nhap' ? 'Thu mua' : 'Bán ra',
    name[t.material] ?? t.material,
    t.partner,
    t.plate,
    t.kg,
    t.pricePerKg,
    t.kg * t.pricePerKg,
  ])
  return '﻿' + [HEADER, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
