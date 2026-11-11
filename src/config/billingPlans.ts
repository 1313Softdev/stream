import { BillingPlanInfo } from '../types';

export const BILLING_PLANS: Record<string, BillingPlanInfo> = {
  '3 Months': {
    period: '3 Months',
    title: 'Quarterly Supercharged',
    durationLabel: '3 Months',
    priceINR: 1999,
    priceUSD: 24,
    storage: '4GB',
    features: [
      '24/7 Non-stop continuous loop streaming',
      '4GB Cloud video storage per slot',
      'Zero computer or phone usage required',
      'YouTube, Facebook, Twitch & Custom RTMP',
      'Ultra-fast dedicated streaming server',
      'Priority WhatsApp & ticket support',
    ],
  },
  'Months': {
    period: 'Months',
    title: 'Monthly Standard',
    durationLabel: '1 Month',
    priceINR: 799,
    priceUSD: 10,
    storage: '4GB',
    features: [
      '24/7 Non-stop continuous loop streaming',
      '4GB Cloud video storage per slot',
      'Full 1080p 60fps broadcast quality',
      'Automated schedule & loop timer',
      'Standard support',
    ],
  },
  'Weeks': {
    period: 'Weeks',
    title: 'Weekly Boost',
    durationLabel: '1 Week',
    priceINR: 299,
    priceUSD: 4,
    storage: '2GB',
    features: [
      '24/7 Continuous streaming for 7 days',
      '2GB Cloud video storage',
      'Instant activation upon order',
      'All platforms supported',
    ],
  },
  'Days': {
    period: 'Days',
    title: 'Daily Trial / Event',
    durationLabel: '1 Day',
    priceINR: 99,
    priceUSD: 1.5,
    storage: '1GB',
    features: [
      '24 Hours nonstop live streaming',
      '1GB Cloud video storage',
      'Perfect for one-off broadcasts or webinars',
    ],
  },
  'Year': {
    period: 'Year',
    title: 'Annual Master Plan',
    durationLabel: '1 Year',
    priceINR: 9999,
    priceUSD: 129,
    storage: '100GB',
    features: [
      '24/7 Non-stop continuous loop streaming for 365 days',
      '100GB Cloud video storage',
      '5 Concurrent Live Slots',
      'Dedicated Cloud Server',
      'VIP Priority Support',
    ],
  },
};

import { SubscriptionPlanItem } from '../types';

export function planItemToBillingPlan(plan: SubscriptionPlanItem): BillingPlanInfo {
  return {
    period: plan.period,
    title: plan.title,
    durationLabel: plan.durationLabel || (plan.durationDays ? `${plan.durationDays} Days` : plan.period),
    priceINR: plan.priceINR,
    priceUSD: plan.priceUSD,
    storage: `${plan.storageGB || 10}GB`,
    features: plan.features && plan.features.length > 0 ? plan.features : (BILLING_PLANS[plan.period]?.features || [
      '24/7 Continuous loop streaming',
      `${plan.storageGB || 10}GB Cloud video storage per slot`,
      'Full 1080p 60fps broadcast quality',
      'All platforms supported',
    ]),
  };
}

export function buildBillingPlansMap(plans?: SubscriptionPlanItem[]): Record<string, BillingPlanInfo> {
  const map: Record<string, BillingPlanInfo> = { ...BILLING_PLANS };
  if (Array.isArray(plans) && plans.length > 0) {
    for (const p of plans) {
      if (!p.isActive) continue;
      const bp = planItemToBillingPlan(p);
      map[p.period] = bp;
      if (p.id) map[p.id] = bp;
    }
  }
  return map;
}

