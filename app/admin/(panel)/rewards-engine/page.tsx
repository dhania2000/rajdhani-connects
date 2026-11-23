import { redirect } from 'next/navigation'
import { REWARD_SECTIONS, rewardHref } from '@/lib/admin-nav'

export default async function RewardsEngineIndex({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { tab, ...rest } = await searchParams
  const section = REWARD_SECTIONS.find((s) => s.legacyTab === tab) ?? REWARD_SECTIONS[0]
  redirect(rewardHref(section.slug, rest))
}
