'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const config = {
  issued: { label: 'Issued', color: 'var(--brand)' },
  redeemed: { label: 'Redeemed', color: 'var(--gold)' },
} satisfies ChartConfig

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return y && mo ? new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short' }) : m
}

export function PointsChart({ data }: { data: { month: string; issued: number; redeemed: number }[] }) {
  const rows = data.map((d) => ({ month: monthLabel(d.month), issued: Number(d.issued), redeemed: Number(d.redeemed) }))
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart data={rows} barGap={4} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => v.toLocaleString('en-IN', { notation: 'compact' })} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="issued" fill="var(--color-issued)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="redeemed" fill="var(--color-redeemed)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  )
}
