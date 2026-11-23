import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Coins, Download, FileUp, Moon, Search, Sun, Truck, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ChartPalette } from './components/Charts'
import { downloadCsv, toCsv } from './lib/exportCsv'
import { parseJsonl } from './lib/importJsonl'
import { computeStock, dailyFlow, kpis, lowStock, tons, vnd, type Direction, type Txn } from './lib/inventory'
import { MATERIALS, sampleTxns } from './lib/sample'

const Charts = lazy(() => import('./components/Charts'))

type Theme = 'dark' | 'light'
const PALETTES: Record<Theme, ChartPalette> = {
  dark: { grid: '#262a30', axis: '#5b626c', label: '#a3aab4', tooltipBg: '#131518', tooltipBorder: '#262a30', cursor: '#1b1e22', gold: '#e3b341' },
  light: { grid: '#e2e5ea', axis: '#8a919c', label: '#4b5361', tooltipBg: '#ffffff', tooltipBorder: '#e2e5ea', cursor: '#f0f2f5', gold: '#b8861b' },
}

// localStorage có thể bị chặn (chế độ riêng tư, iframe): luôn bọc try/catch
function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* bỏ qua */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const TODAY = '2026-11-23'
const RANGES = { '7 ngày': 7, '30 ngày': 30, '60 ngày': 60 } as const
type RangeKey = keyof typeof RANGES

const byCode = Object.fromEntries(MATERIALS.map((m) => [m.code, m]))
const shiftDate = (d: string, days: number) => new Date(new Date(d + 'T00:00:00Z').getTime() - days * 86_400_000).toISOString().slice(0, 10)
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

function Kpi({ icon: Icon, label, value, unit, hint }: { icon: typeof Boxes; label: string; value: string; unit: string; hint?: string }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-ink-300">
        <Icon size={16} className="text-gold" /> {label}
      </div>
      <div className="text-2xl font-semibold tracking-tight">
        {value} <span className="text-sm font-normal text-ink-300">{unit}</span>
      </div>
      {hint && <div className="text-xs text-ink-500">{hint}</div>}
    </div>
  )
}

export default function App() {
  const sample = useMemo(() => sampleTxns(TODAY), [])
  const [imported, setImported] = useState<Txn[]>([])
  const [notice, setNotice] = useState<{ ok: boolean; text: string; details: string[] } | null>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('theme', theme) } catch { /* bỏ qua */ }
  }, [theme])

  const txns = useMemo(() => [...sample, ...imported], [sample, imported])

  // Kéo thả file vào bất kỳ đâu trên trang. Đếm enter/leave để lớp phủ không nhấp nháy khi đi qua phần tử con.
  const [dragging, setDragging] = useState(false)
  const onFileRef = useRef<(f: File) => void>(() => {})
  useEffect(() => {
    let depth = 0
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const enter = (e: DragEvent) => { if (hasFile(e)) { depth++; setDragging(true) } }
    const leave = (e: DragEvent) => { if (hasFile(e) && --depth <= 0) { depth = 0; setDragging(false) } }
    const over = (e: DragEvent) => { if (hasFile(e)) e.preventDefault() }
    const drop = (e: DragEvent) => {
      if (!hasFile(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const f = e.dataTransfer?.files?.[0]
      if (f) onFileRef.current(f)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  async function onFile(file: File) {
    const { txns: rows, errors } = parseJsonl(await file.text(), MATERIALS, `F${Date.now() % 10000}-`)
    try {
      computeStock([...txns, ...rows]) // chặn trường hợp xuất quá tồn
    } catch (e) {
      setNotice({ ok: false, text: 'Không nhập được: ' + (e as Error).message, details: [] })
      return
    }
    setImported((prev) => [...prev, ...rows])
    setNotice({
      ok: errors.length === 0,
      text: `Đã nhập ${rows.length} phiếu từ ${file.name}` + (errors.length ? `, bỏ qua ${errors.length} dòng lỗi` : ''),
      details: errors.slice(0, 5),
    })
  }
  const [range, setRange] = useState<RangeKey>('30 ngày')
  const [query, setQuery] = useState('')
  const [dir, setDir] = useState<Direction | 'all'>('all')

  useEffect(() => { onFileRef.current = onFile })

  const days = RANGES[range]
  const from = shiftDate(TODAY, days - 1)
  const stock = useMemo(() => computeStock(txns), [txns])
  const k = useMemo(() => kpis(txns, from, TODAY), [txns, from])
  const flow = useMemo(() => dailyFlow(txns, TODAY, days).map((r) => ({ ...r, label: ddmm(r.date) })), [txns, days])
  const low = lowStock(stock, MATERIALS)

  const stockRows = MATERIALS.map((m) => ({ ...m, kg: stock.get(m.code)?.kg ?? 0, value: stock.get(m.code)?.value ?? 0 }))
    .sort((a, b) => b.value - a.value)

  const rows = txns
    .filter((t) => t.date >= from)
    .filter((t) => dir === 'all' || t.direction === dir)
    .filter((t) => {
      const q = query.trim().toLowerCase()
      return !q || [t.id, t.partner, t.plate, byCode[t.material].name].some((x) => x.toLowerCase().includes(q))
    })
    .slice()
    .reverse()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Kho phế liệu</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Tổng quan tồn kho</h1>
          <p className="mt-1 text-sm text-ink-300">
            Cập nhật tới {ddmm(TODAY)}/{TODAY.slice(0, 4)} ·{' '}
            <span className="rounded-md bg-ink-800 px-1.5 py-0.5 text-xs text-ink-300">dữ liệu mẫu</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept=".jsonl,.json,application/x-ndjson" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-300 transition hover:border-gold hover:text-gold">
          <FileUp size={15} /> Nhập phiếu cân
        </button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Đổi giao diện sáng / tối"
          className="rounded-xl border border-ink-700 bg-ink-900 p-2.5 text-ink-300 transition hover:border-gold hover:text-gold">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${r === range ? 'bg-gold font-medium text-ink-950' : 'text-ink-300 hover:text-gold'}`}
            >
              {r}
            </button>
          ))}
        </div>
        </div>
      </header>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-gold px-10 py-8 text-center">
            <FileUp size={28} className="mx-auto text-gold" />
            <div className="mt-3 text-lg font-semibold">Thả file phiếu cân để nhập</div>
            <div className="mt-1 text-sm text-ink-300">File .jsonl ghi từ weighbridge-reader</div>
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className={`mb-4 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${notice.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-gold/40 bg-gold/10 text-gold'}`}>
          <div>
            <div>{notice.text}</div>
            {notice.details.map((d) => <div key={d} className="mt-1 text-xs opacity-80">{d}</div>)}
          </div>
          <button onClick={() => setNotice(null)} aria-label="Đóng"><X size={15} /></button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Boxes} label="Tồn kho hiện tại" value={tons(k.stockKg)} unit="tấn" hint={`Giá vốn ${vnd(k.stockValue)} đ`} />
        <Kpi icon={ArrowDownLeft} label={`Thu mua ${range}`} value={tons(k.boughtKg)} unit="tấn" />
        <Kpi icon={ArrowUpRight} label={`Bán ra ${range}`} value={tons(k.soldKg)} unit="tấn" hint={`Doanh thu ${vnd(k.revenue)} đ`} />
        <Kpi icon={Coins} label="Lãi gộp ước tính" value={vnd(k.grossMargin / 1e6)} unit="triệu đ"
          hint={k.revenue ? `Biên ${((k.grossMargin / k.revenue) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% theo giá vốn bình quân` : 'Chưa bán trong kỳ'} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <Suspense fallback={<><div className="card h-[352px] animate-pulse lg:col-span-3" /><div className="card h-[352px] animate-pulse lg:col-span-2" /></>}>
          <Charts flow={flow} stockRows={stockRows} palette={PALETTES[theme]} />
        </Suspense>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card min-w-0 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-300"><Truck size={16} className="text-gold" /> Phiếu cân {range} · {rows.length} phiếu</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => downloadCsv(`phieu-can-${from}-${TODAY}.csv`, toCsv(rows, MATERIALS))} disabled={!rows.length}
                className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-sm text-ink-300 transition hover:border-gold hover:text-gold disabled:opacity-40">
                <Download size={14} /> CSV
              </button>
              <select value={dir} onChange={(e) => setDir(e.target.value as Direction | 'all')}
                className="rounded-lg border border-ink-700 bg-ink-800 px-2 py-1.5 text-sm outline-none">
                <option value="all">Tất cả</option>
                <option value="nhap">Thu mua</option>
                <option value="xuat">Bán ra</option>
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800 px-2.5 py-1.5">
                <Search size={14} className="text-ink-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Biển số, đối tác, loại…"
                  className="w-32 bg-transparent sm:w-40 text-sm outline-none placeholder:text-ink-500" />
              </label>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="sticky top-0 bg-ink-900 text-left text-xs text-ink-500">
                <tr>
                  {['Số', 'Ngày', 'Loại', 'Đối tác', 'Biển số', 'Khối lượng', 'Đơn giá', 'Thành tiền'].map((h, i) => (
                    <th key={h} className={`pb-2 font-medium ${i >= 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-ink-800 hover:bg-ink-800/50">
                    <td className="py-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${t.direction === 'nhap' ? 'bg-gold/15 text-gold' : 'bg-sky-400/15 text-sky-500'}`}>{t.id}</span>
                    </td>
                    <td className="text-ink-300">{ddmm(t.date)}</td>
                    <td>
                      <span className="mr-2 inline-block size-2 rounded-full" style={{ background: byCode[t.material].color }} />
                      {byCode[t.material].name}
                    </td>
                    <td className="text-ink-300">{t.partner}</td>
                    <td className="font-mono text-xs text-ink-300">{t.plate}</td>
                    <td className="text-right">{vnd(t.kg)} kg</td>
                    <td className="text-right text-ink-300">{vnd(t.pricePerKg)}</td>
                    <td className="text-right font-medium">{vnd(t.kg * t.pricePerKg)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={8} className="py-10 text-center text-ink-500">Không có phiếu nào khớp.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2 text-sm text-ink-300"><AlertTriangle size={16} className="text-gold" /> Cảnh báo tồn thấp</div>
          {low.length === 0 && <p className="text-sm text-ink-500">Mọi loại đều trên ngưỡng tối thiểu.</p>}
          <ul className="space-y-3">
            {low.map((m) => {
              const kg = stock.get(m.code)?.kg ?? 0
              const pct = Math.min(100, (kg / m.minStockKg) * 100)
              return (
                <li key={m.code}>
                  <div className="flex justify-between text-sm">
                    <span>{m.name}</span>
                    <span className="text-ink-300">{vnd(kg)} / {vnd(m.minStockKg)} kg</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-ink-800">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="mt-6 border-t border-ink-800 pt-4 text-xs leading-relaxed text-ink-500">
            Giá vốn tính theo bình quân gia quyền di động. Lãi gộp là ước tính, chưa trừ chi phí vận chuyển, bốc xếp và hao hụt.
          </div>
        </div>
      </section>

      <footer className="mt-10 text-center text-xs text-ink-500">
        Số liệu mặc định là dữ liệu mẫu sinh tự động, không phải số liệu kinh doanh thật. Phiếu nhập từ file chỉ nằm trong trình duyệt của bạn ·{' '}
        <a className="text-ink-300 hover:text-gold" href="https://github.com/ferbdev-byte/scrap-inventory-dashboard">Mã nguồn</a>
      </footer>
    </div>
  )
}
