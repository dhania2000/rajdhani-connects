'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Product } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'

export interface CartItem {
  productId: string
  name: string
  brand: string
  unit: string
  image?: string
  /** Points per unit at the time it was added (the store confirms final points). */
  points?: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  count: number
  estimatedPoints: number
  quantityOf: (productId: string) => number
  add: (product: Product, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartStore | null>(null)

/** The contractor's cart, kept on this device per contractor until they send it to the store. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useContractor()
  const key = `rc_cart_${profile.id}`
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (Array.isArray(saved)) setItems(saved.filter((i) => i && typeof i.productId === 'string' && Number(i.quantity) > 0))
    } catch {}
    setLoaded(true)
  }, [key])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(key, JSON.stringify(items))
    } catch {}
  }, [items, key, loaded])

  const add = useCallback((p: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id)
      if (existing) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + quantity } : i))
      return [...prev, { productId: p.id, name: p.name, brand: p.brand, unit: p.unit, image: p.image, points: p.points, quantity }]
    })
  }, [])

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.productId !== productId) : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    )
  }, [])

  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartStore>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      estimatedPoints: Math.round(items.reduce((n, i) => n + (i.points ?? 0) * i.quantity, 0)),
      quantityOf: (id) => items.find((i) => i.productId === id)?.quantity ?? 0,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, add, setQuantity, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
