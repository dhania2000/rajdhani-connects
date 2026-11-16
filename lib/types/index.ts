export type ApprovalStatus = 'approved' | 'pending' | 'rejected'

export interface ContractorProfile {
  id: string
  name: string
  avatarUrl: string
  verified: boolean
  mobile: string
  address: string
  area: string
  joinedOn: string
  accountStatus: 'Active' | 'Inactive' | 'Suspended'
}

export interface RewardSummary {
  totalEarned: number
  available: number
  pending: number
  redeemed: number
}

export type PerformancePeriod = 'today' | 'week' | 'month' | 'last-month' | 'custom'

export interface PerformanceMetrics {
  salesBrought: number
  rewardsEarned: number
}

export interface SaleRecord {
  id: string
  reference: string
  customer: string
  date: string
  product: string
  amount: number
  status: ApprovalStatus
  reward: number
}

export interface RewardTransaction {
  id: string
  date: string
  invoiceRef: string
  product: string
  points: number
  status: 'credited' | 'pending' | 'redeemed'
}

export type GiftAvailability = 'in-stock' | 'limited' | 'out-of-stock'

export interface Gift {
  id: string
  name: string
  description: string
  points: number
  image: string
  availability: GiftAvailability
}

export type ClaimStatus = 'requested' | 'approved' | 'delivered'

export interface RewardClaim {
  id: string
  giftId: string
  giftName: string
  points: number
  requestedOn: string
  status: ClaimStatus
}

export type LedgerEntryType = 'credit' | 'debit' | 'udhar' | 'advance'

export interface LedgerEntry {
  id: string
  date: string
  description: string
  type: LedgerEntryType
  amount: number
}

export type ProductCategoryId = 'tiles' | 'sanitary' | 'adhesive' | 'marble' | 'stone' | 'other'

export interface ProductCategory {
  id: ProductCategoryId
  name: string
  image: string
}

export interface Product {
  id: string
  name: string
  brand: string
  unit: string
  category: ProductCategoryId
  scheme?: string
}

export type OfferState = 'active' | 'expiring' | 'upcoming'

export interface Offer {
  id: string
  title: string
  description: string
  state: OfferState
  validTill: string
  multiplier?: number
}

export interface SchemeTarget {
  id: string
  title: string
  current: number
  target: number
  unit: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  kind: 'reward' | 'sale' | 'offer' | 'system'
}

export interface NotificationPreferences {
  rewards: boolean
  sales: boolean
  offers: boolean
  sms: boolean
}
