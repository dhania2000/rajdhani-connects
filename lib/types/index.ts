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
  /** Admin-entered product description, if any. */
  description?: string
  quantity?: string
  amount: number
  status: ApprovalStatus
  /** Points credited, or the points the admin set for a sale still pending approval. */
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

export type ClaimStatus = 'requested' | 'approved' | 'delivered' | 'rejected'

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

/** Category slug, managed by admins in the product catalogue. */
export type ProductCategoryId = string

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
  image?: string
  description?: string
  /** Reward points per unit, when the admin set them. */
  points?: number
}

export type EnquiryStatus = 'new' | 'contacted' | 'completed' | 'cancelled'

export interface CartRequest {
  id: string
  createdOn: string
  status: EnquiryStatus
  customerName?: string
  estimatedPoints: number
  adminNote?: string
  items: { name: string; unit?: string; quantity: number; pointsPerUnit?: number }[]
}

export type OfferState = 'active' | 'expiring' | 'upcoming'

export type OfferRewardType = 'points' | 'tokens' | 'gift' | 'multiplier' | 'info'
export type OfferTargetUnit = 'points' | 'tokens' | 'amount' | 'quantity'

export interface Offer {
  id: string
  title: string
  description: string
  state: OfferState
  startDate: string
  validTill: string
  multiplier?: number
  rewardType: OfferRewardType
  /** Points / tokens awarded (or the multiplier, for multiplier offers). */
  rewardValue?: number
  bannerUrl?: string
  terms?: string
  featured: boolean
  /** Present when the admin set a target for this offer. */
  target?: {
    value: number
    unit: OfferTargetUnit
    /** The contractor's progress within the offer dates; only when the admin enabled "Show progress". */
    current?: number
  }
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
