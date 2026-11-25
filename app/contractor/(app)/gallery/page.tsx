import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { GalleryView } from '@/components/contractor/gallery/gallery-view'
import { requireContractor } from '@/lib/server/auth'
import { listContractorPhotos } from '@/lib/server/contractor-photos'

export const metadata: Metadata = { title: 'Gallery – Rajdhani Connects' }
export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const session = await requireContractor()
  const photos = await listContractorPhotos(session.contractorId).catch(() => [])
  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos shared by the store" />
      <GalleryView photos={photos} />
    </>
  )
}
