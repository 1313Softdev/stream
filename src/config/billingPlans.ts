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
};

