import type {
  AppNotification,
  ContractorProfile,
  Gift,
  LedgerEntry,
  NotificationPreferences,
  Offer,
  PerformanceMetrics,
  PerformancePeriod,
  Product,
  ProductCategory,
  RewardClaim,
  RewardSummary,
  RewardTransaction,
  SaleRecord,
  SchemeTarget,
} from '@/lib/types'

export const BRAND_NAME = 'Rajdhani Tiles & Sanitary'
export const STORE_PHONE = '+91 6378743129'

export const contractorProfile: ContractorProfile = {
  id: 'RTS-C-1042',
  name: 'Ramesh Mistri',
  avatarUrl: '/images/contractor-avatar.png',
  verified: true,
  mobile: '+91 98290 45127',
  address: 'Plot 14, Shastri Nagar, Near Hanuman Mandir',
  area: 'Jaipur, Rajasthan',
  joinedOn: '2023-03-12',
  accountStatus: 'Active',
}

export const rewardSummary: RewardSummary = {
  totalEarned: 32400,
  available: 18500,
  pending: 2900,
  redeemed: 11000,
}

export const performanceByPeriod: Record<Exclude<PerformancePeriod, 'custom'>, PerformanceMetrics> = {
  today: { salesBrought: 8500, rewardsEarned: 340 },
  week: { salesBrought: 36200, rewardsEarned: 1450 },
  month: { salesBrought: 124000, rewardsEarned: 5000 },
  'last-month': { salesBrought: 98500, rewardsEarned: 3900 },
}

export const performancePeriodOptions: { value: PerformancePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
]

export const salesRecords: SaleRecord[] = [
  { id: 's1', reference: 'RTS-INV-24581', customer: 'Suresh Agarwal', date: '2026-11-14', product: 'Kajaria Vitrified Tiles 600x600', amount: 42000, status: 'approved', reward: 1680 },
  { id: 's2', reference: 'RTS-INV-24566', customer: 'Meena Sharma', date: '2026-11-12', product: 'Jaquar Wall-hung WC Set', amount: 28500, status: 'pending', reward: 1140 },
  { id: 's3', reference: 'RTS-INV-24540', customer: 'Vikram Singh', date: '2026-11-09', product: 'MYK Laticrete Tile Adhesive (40 bags)', amount: 18200, status: 'approved', reward: 910 },
  { id: 's4', reference: 'RTS-INV-24512', customer: 'Anil Kumawat', date: '2026-11-05', product: 'Makrana White Marble', amount: 35300, status: 'approved', reward: 1410 },
  { id: 's5', reference: 'RTS-INV-24497', customer: 'Pooja Jain', date: '2026-11-02', product: 'Somany Floor Tiles 800x800', amount: 22800, status: 'rejected', reward: 0 },
  { id: 's6', reference: 'RTS-INV-24420', customer: 'Rahul Meena', date: '2026-10-27', product: 'Cera Wash Basin & Faucet', amount: 14600, status: 'approved', reward: 580 },
  { id: 's7', reference: 'RTS-INV-24391', customer: 'Kavita Choudhary', date: '2026-10-21', product: 'Kota Stone Flooring', amount: 31200, status: 'pending', reward: 1250 },
  { id: 's8', reference: 'RTS-INV-24355', customer: 'Deepak Saini', date: '2026-10-15', product: 'Kajaria Wall Tiles 300x450', amount: 19600, status: 'approved', reward: 780 },
]

export const rewardTransactions: RewardTransaction[] = [
  { id: 'r1', date: '2026-11-14', invoiceRef: 'RTS-INV-24581', product: 'Kajaria Vitrified Tiles', points: 1680, status: 'credited' },
  { id: 'r2', date: '2026-11-12', invoiceRef: 'RTS-INV-24566', product: 'Jaquar Wall-hung WC Set', points: 1140, status: 'pending' },
  { id: 'r3', date: '2026-11-09', invoiceRef: 'RTS-INV-24540', product: 'MYK Tile Adhesive', points: 910, status: 'credited' },
  { id: 'r4', date: '2026-11-05', invoiceRef: 'RTS-INV-24512', product: 'Makrana White Marble', points: 1410, status: 'credited' },
  { id: 'r5', date: '2026-10-30', invoiceRef: 'CLM-0918', product: 'Mobile Phone (Gift)', points: 11000, status: 'redeemed' },
  { id: 'r6', date: '2026-10-27', invoiceRef: 'RTS-INV-24420', product: 'Cera Wash Basin & Faucet', points: 580, status: 'credited' },
  { id: 'r7', date: '2026-10-21', invoiceRef: 'RTS-INV-24391', product: 'Kota Stone Flooring', points: 1250, status: 'pending' },
  { id: 'r8', date: '2026-10-15', invoiceRef: 'RTS-INV-24355', product: 'Kajaria Wall Tiles', points: 780, status: 'credited' },
]

export const gifts: Gift[] = [
  { id: 'glue-mixer', name: 'Glue Mixer', description: '1400W heavy-duty paddle mixer for tile adhesive, grout and putty. Variable speed with steel paddle.', points: 3500, image: '/images/gifts/glue-mixer.png', availability: 'in-stock' },
  { id: 'mobile-phone', name: 'Mobile Phone', description: '6.6" Android smartphone with 128GB storage, 50MP camera and 5000mAh battery.', points: 12000, image: '/images/gifts/mobile-phone.png', availability: 'in-stock' },
  { id: 'led-tv', name: 'LED TV', description: '43" Full HD smart LED TV with built-in apps and two HDMI ports.', points: 25000, image: '/images/gifts/led-tv.png', availability: 'limited' },
  { id: 'refrigerator', name: 'Refrigerator', description: '260L frost-free double door refrigerator with inverter compressor.', points: 32000, image: '/images/gifts/refrigerator.png', availability: 'limited' },
  { id: 'washing-machine', name: 'Washing Machine', description: '7kg fully-automatic front load washing machine with quick wash.', points: 28000, image: '/images/gifts/washing-machine.png', availability: 'out-of-stock' },
  { id: 'motorcycle', name: 'Motorcycle', description: '125cc commuter motorcycle with disc brake. Registration charges extra.', points: 85000, image: '/images/gifts/motorcycle.png', availability: 'in-stock' },
]

export const initialClaims: RewardClaim[] = [
  { id: 'CLM-0918', giftId: 'mobile-phone', giftName: 'Mobile Phone', points: 11000, requestedOn: '2026-10-30', status: 'delivered' },
]

export const ledgerOpeningBalance = 15000

export const ledgerEntries: LedgerEntry[] = [
  { id: 'l1', date: '2026-11-15', description: 'Advance for Agarwal site material', type: 'advance', amount: 10000 },
  { id: 'l2', date: '2026-11-12', description: 'Payment received – cash', type: 'credit', amount: 25000 },
  { id: 'l3', date: '2026-11-08', description: 'Tile adhesive 40 bags on credit', type: 'udhar', amount: 12400 },
  { id: 'l4', date: '2026-11-03', description: 'Marble purchase – Kumawat site', type: 'debit', amount: 18500 },
  { id: 'l5', date: '2026-10-28', description: 'Payment received – UPI', type: 'credit', amount: 15000 },
  { id: 'l6', date: '2026-10-20', description: 'Sanitary fittings on credit', type: 'udhar', amount: 8600 },
]

export const productCategories: ProductCategory[] = [
  { id: 'tiles', name: 'Tiles', image: '/images/products/tiles.png' },
  { id: 'sanitary', name: 'Sanitary', image: '/images/products/sanitary.png' },
  { id: 'adhesive', name: 'Tile Adhesive / Glue', image: '/images/products/adhesive.png' },
  { id: 'marble', name: 'Marble', image: '/images/products/marble.png' },
  { id: 'stone', name: 'Stone', image: '/images/products/stone.png' },
  { id: 'other', name: 'Other Products', image: '/images/products/other.png' },
]

export const products: Product[] = [
  { id: 'p1', name: 'Vitrified Floor Tile 600x600', brand: 'Kajaria', unit: 'per box (4 pcs)', category: 'tiles', scheme: '2x points this month' },
  { id: 'p2', name: 'Glossy Wall Tile 300x450', brand: 'Somany', unit: 'per box (6 pcs)', category: 'tiles' },
  { id: 'p3', name: 'Wall-hung WC with Seat', brand: 'Jaquar', unit: 'per piece', category: 'sanitary', scheme: '₹500 bonus reward' },
  { id: 'p4', name: 'Table-top Wash Basin', brand: 'Cera', unit: 'per piece', category: 'sanitary' },
  { id: 'p5', name: 'Tile Adhesive Type 1', brand: 'MYK Laticrete', unit: 'per 20 kg bag', category: 'adhesive', scheme: '25 pts per bag' },
  { id: 'p6', name: 'Stone & Tile Adhesive', brand: 'Roff', unit: 'per 20 kg bag', category: 'adhesive' },
  { id: 'p7', name: 'Makrana White Marble', brand: 'Rajdhani Select', unit: 'per sq. ft.', category: 'marble' },
  { id: 'p8', name: 'Italian Statuario Marble', brand: 'Rajdhani Select', unit: 'per sq. ft.', category: 'marble', scheme: '1.5x points' },
  { id: 'p9', name: 'Kota Stone Natural', brand: 'Rajdhani Select', unit: 'per sq. ft.', category: 'stone' },
  { id: 'p10', name: 'Jaisalmer Yellow Stone', brand: 'Rajdhani Select', unit: 'per sq. ft.', category: 'stone' },
  { id: 'p11', name: 'Epoxy Tile Grout', brand: 'MYK Laticrete', unit: 'per 1 kg tub', category: 'other' },
  { id: 'p12', name: 'Tile Spacers 3mm', brand: 'Generic', unit: 'per pack (200)', category: 'other' },
]

export const offers: Offer[] = [
  { id: 'o1', title: 'Double Points on Kajaria Tiles', description: 'Earn 2x reward points on every Kajaria vitrified tile referral.', state: 'active', validTill: '2026-11-30', multiplier: 2 },
  { id: 'o2', title: 'Adhesive Bonanza', description: 'Get 25 bonus points for every bag of tile adhesive referred.', state: 'active', validTill: '2026-12-15' },
  { id: 'o3', title: 'Marble Festive Offer', description: '1.5x points on Italian marble purchases above ₹50,000.', state: 'expiring', validTill: '2026-11-20', multiplier: 1.5 },
  { id: 'o4', title: 'Winter Sanitary Scheme', description: 'Flat ₹500 bonus reward on every Jaquar WC set referral.', state: 'upcoming', validTill: '2027-01-31' },
]

export const schemeTargets: SchemeTarget[] = [
  { id: 't1', title: 'Motorcycle Reward', current: 80, target: 100, unit: 'tokens' },
  { id: 't2', title: 'Monthly Sales Target', current: 124000, target: 200000, unit: '₹' },
]

export const notifications: AppNotification[] = [
  { id: 'n1', title: 'Reward credited', body: '1,680 points credited for invoice RTS-INV-24581.', time: '2 hours ago', kind: 'reward' },
  { id: 'n2', title: 'Sale pending approval', body: 'Referral for Meena Sharma is under review.', time: 'Yesterday', kind: 'sale' },
  { id: 'n3', title: 'Offer ending soon', body: 'Marble Festive Offer ends on 20 Nov.', time: '2 days ago', kind: 'offer' },
  { id: 'n4', title: 'Gift delivered', body: 'Your Mobile Phone reward has been delivered.', time: '1 week ago', kind: 'reward' },
  { id: 'n5', title: 'Profile verified', body: 'You are now a Verified Partner.', time: '3 weeks ago', kind: 'system' },
]

export const defaultNotificationPreferences: NotificationPreferences = {
  rewards: true,
  sales: true,
  offers: true,
  sms: false,
}

export function getCustomRangePerformance(from: string, to: string): PerformanceMetrics {
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1)
  const salesBrought = days * 4100
  return { salesBrought, rewardsEarned: Math.round(salesBrought * 0.04) }
}
