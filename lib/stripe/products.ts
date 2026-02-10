// lib/stripe/products.ts

/**
 * Stripe product configuration.
 * Maps price IDs to what each purchase unlocks.
 * 
 * IMPORTANT: These are TEST mode price IDs.
 * When going live, create products in live mode and update these IDs.
 */

export type ProductType = 'leaves_50' | 'leaves_100' | 'starter_pack' | 'family_pack';

export type ProductConfig = {
  priceId: string;
  productType: ProductType;
  name: string;
  description: string;
  price: number; // display price in dollars
  leavesAdded: number;
  treesAdded: number;
  badge?: string; // optional badge like "BEST VALUE"
};

export const PRODUCTS: ProductConfig[] = [
  {
    priceId: 'price_1SzKonI2GFCyAoY4VyT2jC4X',
    productType: 'leaves_50',
    name: '+50 Leaves',
    description: 'Add 50 more people to your trees',
    price: 1.99,
    leavesAdded: 50,
    treesAdded: 0,
  },
  {
    priceId: 'price_1SzKpbI2GFCyAoY4cgdC6hx1',
    productType: 'leaves_100',
    name: '+100 Leaves',
    description: 'Add 100 more people to your trees',
    price: 2.99,
    leavesAdded: 100,
    treesAdded: 0,
  },
  {
    priceId: 'price_1SzKqGI2GFCyAoY4n2CputLU',
    productType: 'starter_pack',
    name: 'Starter Pack',
    description: '+1 Canvas & +100 Leaves',
    price: 4.99,
    leavesAdded: 100,
    treesAdded: 1,
    badge: 'SAVE $1',
  },
  {
    priceId: 'price_1SzKr1I2GFCyAoY4TI2IsRZ9',
    productType: 'family_pack',
    name: 'Family Pack',
    description: '+3 Canvases & +200 Leaves',
    price: 9.99,
    leavesAdded: 200,
    treesAdded: 3,
    badge: 'BEST VALUE',
  },
];

// Lookup by price ID (used by webhook)
export const PRODUCT_BY_PRICE_ID: Record<string, ProductConfig> = {};
for (const p of PRODUCTS) {
  PRODUCT_BY_PRICE_ID[p.priceId] = p;
}

// Lookup by product type
export const PRODUCT_BY_TYPE: Record<ProductType, ProductConfig> = {} as any;
for (const p of PRODUCTS) {
  PRODUCT_BY_TYPE[p.productType] = p;
}