import { describe, expect, it } from 'vitest'
import { matchMaterial, parseJsonl } from './importJsonl'
import { MATERIALS } from './sample'

describe('matchMaterial', () => {
  it.each([
    ['Sắt vụn loại 2', 'sat-vun'],
    ['sắt đặc', 'sat-dac'],
    ['DONG CAP', 'dong-cap'],
    ['Inox 304', 'inox-304'],
    ['nhom-lon', 'nhom-lon'],
  ])('%s → %s', (name, code) => {
    expect(matchMaterial(name, MATERIALS)).toBe(code)
  })

  it('trả null khi không nhận ra', () => {
    expect(matchMaterial('vàng 9999', MATERIALS)).toBeNull()
    expect(matchMaterial('', MATERIALS)).toBeNull()
  })
})

describe('parseJsonl', () => {
  const line = (o: object) => JSON.stringify(o)
  const ok = {
    plate: '51C-123.45', material: 'Sắt vụn', gross_kg: 24360, tare_kg: 9120, impurity_pct: 2, unit_price: 8000,
    times: { lan_1: '2026-11-23T08:15:02', lan_2: '2026-11-23T08:31:47' },
  }

  it('đọc đúng một phiếu từ weighbridge-reader', () => {
    const { txns, errors } = parseJsonl(line(ok), MATERIALS)
    expect(errors).toEqual([])
    expect(txns[0]).toMatchObject({ date: '2026-11-23', direction: 'nhap', material: 'sat-vun', kg: 14935, pricePerKg: 8000, plate: '51C-123.45' })
  })

  it('báo lỗi từng dòng, không bỏ cả file', () => {
    const text = [line(ok), 'không phải json', line({ ...ok, material: 'vàng' }), line({ ...ok, unit_price: 0 }), line({ ...ok, times: {} }), ''].join('\n')
    const { txns, errors } = parseJsonl(text, MATERIALS)
    expect(txns).toHaveLength(1)
    expect(errors).toHaveLength(4)
    expect(errors[0]).toMatch(/Dòng 2/)
  })

  it('nhận phiếu bán ra khi direction = xuat', () => {
    expect(parseJsonl(line({ ...ok, direction: 'xuat' }), MATERIALS).txns[0].direction).toBe('xuat')
  })
})
