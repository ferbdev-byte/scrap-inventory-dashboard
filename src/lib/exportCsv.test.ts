import { describe, expect, it } from 'vitest'
import { cell, toCsv } from './exportCsv'
import type { Txn } from './inventory'
import { MATERIALS } from './sample'

const t: Txn = { id: 'N0001', date: '2026-11-23', direction: 'nhap', material: 'sat-vun', kg: 14935, pricePerKg: 8000, partner: 'Cơ khí "Mẫu", B', plate: '51C-123.45' }

describe('cell', () => {
  it('bọc dấu phẩy, ngoặc kép, xuống dòng', () => {
    expect(cell('a,b')).toBe('"a,b"')
    expect(cell('nói "chào"')).toBe('"nói ""chào"""')
    expect(cell('hai\ndòng')).toBe('"hai\ndòng"')
    expect(cell(14935)).toBe('14935')
  })

  it('chặn công thức Excel', () => {
    expect(cell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(cell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(cell(-5)).toBe('-5') // số âm thật không bị đụng
  })
})

describe('toCsv', () => {
  it('có BOM, tiêu đề tiếng Việt, ngày dd/mm/yyyy, thành tiền', () => {
    const csv = toCsv([t], MATERIALS)
    expect(csv.startsWith('﻿Số phiếu,Ngày')).toBe(true)
    const line = csv.trim().split('\r\n')[1]
    expect(line).toBe('N0001,23/11/2026,Thu mua,Sắt vụn,"Cơ khí ""Mẫu"", B",51C-123.45,14935,8000,119480000')
  })
})
