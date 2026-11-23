import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Coins, Search, TrendingUp, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { computeStock, dailyFlow, kpis, lowStock, tons, vnd, type Direction } from './lib/inventory'
import { MATERIALS, sampleTxns } from './lib/sample'

const TODAY = '2026-11-23'
const RANGES = { '7 ngày': 7, '30 ngày': 30, '60 ngày': 60 } as const
type RangeKey = keyof typeof RANGES

const byCode = Object.fromEntries(MATERIALS.map((m) => [m.code, m]))
const shiftDate = (d: string, days: number) => new Date(new Date(d + 'T00:00:00Z').getTime() - days * 86_400_000).toISOString().slice(0, 10)
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

const tooltipStyle = {
  contentStyle: { background: '#131518', border: '1px solid #262a30', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#a3aab4' },
}

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
  const txns = useMemo(() => sampleTxns(TODAY), [])
  const [range, setRange] = useState<RangeKey>('30 ngày')
  const [query, setQuery] = useState('')
  const [dir, setDir] = useState<Direction | 'all'>('all')

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
        <div className="flex rounded-xl border border-ink-700 bg-ink-900 p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${r === range ? 'bg-gold font-medium text-ink-950' : 'text-ink-300 hover:text-white'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Boxes} label="Tồn kho hiện tại" value={tons(k.stockKg)} unit="tấn" hint={`Giá vốn ${vnd(k.stockValue)} đ`} />
        <Kpi icon={ArrowDownLeft} label={`Thu mua ${range}`} value={tons(k.boughtKg)} unit="tấn" />
        <Kpi icon={ArrowUpRight} label={`Bán ra ${range}`} value={tons(k.soldKg)} unit="tấn" hint={`Doanh thu ${vnd(k.revenue)} đ`} />
        <Kpi icon={Coins} label="Lãi gộp ước tính" value={vnd(k.grossMargin / 1e6)} unit="triệu đ"
          hint={k.revenue ? `Biên ${((k.grossMargin / k.revenue) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% theo giá vốn bình quân` : 'Chưa bán trong kỳ'} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="card min-w-0 lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-300">
            <span className="flex items-center gap-2"><TrendingUp size={16} className="text-gold" /> Nhập – xuất theo ngày</span>
            <span className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-gold" /> Thu mua</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-400" /> Bán ra</span>
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={flow} margin={{ left: 0, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e3b341" stopOpacity={0.45} /><stop offset="1" stopColor="#e3b341" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity={0.35} /><stop offset="1" stopColor="#38bdf8" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="#262a30" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#5b626c', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
                <YAxis tick={{ fill: '#5b626c', fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${v / 1000}t`} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${vnd(Number(v))} kg`} />
                <Area type="monotone" dataKey="nhap" name="Thu mua" stroke="#e3b341" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="xuat" name="Bán ra" stroke="#38bdf8" fill="url(#gOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card min-w-0 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-sm text-ink-300"><Boxes size={16} className="text-gold" /> Giá trị tồn theo loại (triệu đ)</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stockRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={96} tick={{ fill: '#a3aab4', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#1b1e22' }}
                  formatter={(v, _n, p) => [`${vnd(Number(v) / 1e6)} triệu đ · ${tons(p.payload.kg)} tấn`, 'Tồn']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stockRows.map((r) => <Cell key={r.code} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card min-w-0 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-ink-300"><Truck size={16} className="text-gold" /> Phiếu cân {range} · {rows.length} phiếu</div>
            <div className="flex gap-2">
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
                      <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${t.direction === 'nhap' ? 'bg-gold/15 text-gold' : 'bg-sky-400/15 text-sky-300'}`}>{t.id}</span>
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
        Số liệu trên trang là dữ liệu mẫu sinh tự động, không phải số liệu kinh doanh thật ·{' '}
        <a className="text-ink-300 hover:text-gold" href="https://github.com/ferbdev-byte/scrap-inventory-dashboard">Mã nguồn</a>
      </footer>
    </div>
  )
}
