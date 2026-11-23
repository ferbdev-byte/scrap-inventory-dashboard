// Biểu đồ tách riêng để tải lười (React.lazy): Recharts không nằm trong bundle chính.
import { Boxes, TrendingUp } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { tons, vnd, type DayFlow } from '../lib/inventory'

export interface ChartPalette {
  grid: string
  axis: string
  label: string
  tooltipBg: string
  tooltipBorder: string
  cursor: string
  gold: string
}

interface Props {
  flow: (DayFlow & { label: string })[]
  stockRows: { code: string; name: string; color: string; kg: number; value: number }[]
  palette: ChartPalette
}

export default function Charts({ flow, stockRows, palette: p }: Props) {
  const tooltip = {
    contentStyle: { background: p.tooltipBg, border: `1px solid ${p.tooltipBorder}`, borderRadius: 12, fontSize: 12 },
    labelStyle: { color: p.label },
  }
  return (
    <>
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
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.gold} stopOpacity={0.45} /><stop offset="1" stopColor={p.gold} stopOpacity={0} /></linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" stopOpacity={0.35} /><stop offset="1" stopColor="#38bdf8" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke={p.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis tick={{ fill: p.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v: number) => `${v / 1000}t`} />
              <Tooltip {...tooltip} formatter={(v) => `${vnd(Number(v))} kg`} />
              <Area type="monotone" dataKey="nhap" name="Thu mua" stroke={p.gold} fill="url(#gIn)" strokeWidth={2} />
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
              <YAxis type="category" dataKey="name" width={96} tick={{ fill: p.label, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltip} cursor={{ fill: p.cursor }}
                formatter={(v, _n, item) => [`${vnd(Number(v) / 1e6)} triệu đ · ${tons(item.payload.kg)} tấn`, 'Tồn']} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {stockRows.map((r) => <Cell key={r.code} fill={r.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}
