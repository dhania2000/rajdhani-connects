import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { TileVisualizer } from '@/components/contractor/visualizer/tile-visualizer'
import { CartHeaderButton } from '@/components/contractor/cart/cart-controls'
import { getProductCatalogue } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Visualizer – Rajdhani Connects' }

export default async function VisualizerPage() {
  const { products } = await getProductCatalogue()
  return (
    <>
      <PageHeader title="Visualizer" subtitle="See tiles on your own wall or floor" action={<CartHeaderButton />} />
      <TileVisualizer products={products.filter((p) => p.texture)} />
    </>
  )
}
