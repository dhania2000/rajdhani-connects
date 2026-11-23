import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ProfileView } from '@/components/contractor/profile/profile-view'

export const metadata: Metadata = { title: 'Profile – Rajdhani Tiles & Sanitary' }

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="My Profile" />
      <ProfileView />
    </>
  )
}
