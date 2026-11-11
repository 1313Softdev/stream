import React, { useState } from 'react';
import { Minus, Plus, X, ChevronDown, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { BillingPeriod, Slot, UserProfile, SubscriptionPlanItem } from '../types';
import { BILLING_PLANS } from '../config/billingPlans';
import { PaymentModal } from './PaymentModal';

interface BillingViewProps {
  slots: Slot[];
  user: UserProfile;
  plans?: SubscriptionPlanItem[];
  onRenewSlot: (slotId: string, period: BillingPeriod, count: number, utrNumber?: string) => void;
  onAddSlotsPurchased: (period: BillingPeriod, count: number) => void;
  onOpenContact: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  slots,
  user,
  plans,
  onRenewSlot,
  onAddSlotsPurchased,
  onOpenContact,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'Add Slots' | 'Renew Slots'>('Renew Slots');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Quantity counts
  const [renewCount, setRenewCount] = useState<number>(1);
  const [addCount, setAddCount] = useState<number>(1);

  // Contact details form
  const [country, setCountry] = useState<string>(user.country || 'India');
  const [city, setCity] = useState<string>(user.city || 'Mohali');
  const [phone, setPhone] = useState<string>(user.phone || '88470 57896');
  const [phoneCode, setPhoneCode] = useState<string>(user.phoneCode || '+91');

  // Order confirmation & Payment modal
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [submittedUtr, setSubmittedUtr] = useState<string>('');

  const activePlans: SubscriptionPlanItem[] = (plans && plans.length > 0)
    ? plans.filter((p) => p.isActive)
    : [
        { id: 'plan_days', title: 'Daily Trial / Event', period: 'Days', durationLabel: '1 Day', durationDays: 1, priceINR: 99, priceUSD: 1.5, storageGB: 1, maxSlots: 1, features: ['24 Hours nonstop live streaming', '1GB Cloud video storage', 'Perfect for one-off broadcasts or webinars'], isActive: true, isPopular: false, displayOrder: 1 },
        { id: 'plan_weeks', title: 'Weekly Boost', period: 'Weeks', durationLabel: '1 Week', durationDays: 7, priceINR: 299, priceUSD: 4, storageGB: 2, maxSlots: 1, features: ['24/7 Continuous streaming for 7 days', '2GB Cloud video storage', 'Instant activation upon order', 'All platforms supported'], isActive: true, isPopular: false, displayOrder: 2 },
        { id: 'plan_months', title: 'Monthly Standard', period: 'Months', durationLabel: '1 Month', durationDays: 30, priceINR: 799, priceUSD: 10, storageGB: 4, maxSlots: 1, features: ['24/7 Non-stop continuous loop streaming', '4GB Cloud video storage per slot', 'Full 1080p 60fps broadcast quality', 'Automated schedule & loop timer', 'Standard support'], isActive: true, isPopular: false, displayOrder: 3 },
        { id: 'plan_3months', title: 'Quarterly Supercharged', period: '3 Months', durationLabel: '3 Months', durationDays: 90, priceINR: 1999, priceUSD: 24, storageGB: 4, maxSlots: 1, features: ['24/7 Non-stop continuous loop streaming', '4GB Cloud video storage per slot', 'Zero computer or phone usage required', 'YouTube, Facebook, Twitch & Custom RTMP', 'Ultra-fast dedicated streaming server', 'Priority WhatsApp & ticket support'], isActive: true, isPopular: true, displayOrder: 4 },
      ];

  const currentPlan = (selectedPlanId && activePlans.find((p) => p.id === selectedPlanId)) ||
                      activePlans.find((p) => p.period === '3 Months') ||
                      activePlans[0];
  const unitPrice = currency === 'INR' ? currentPlan.priceINR : currentPlan.priceUSD;
  const currentCount = activeTab === 'Renew Slots' ? renewCount : addCount;
  const totalPrice = unitPrice * currentCount;

  const currentSlot = slots[0] || {
    id: '6ae0fddc4863791bef736a11',
    name: 'Slot 1793129948103',
    status: 'active',
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (utr: string) => {
    setSubmittedUtr(utr);
    setIsPaymentModalOpen(false);
    if (activeTab === 'Renew Slots') {
      onRenewSlot(currentSlot.id, currentPlan.period, renewCount, utr);
    }
    // In 'Add Slots', do NOT add premature slots prior to admin payment confirmation.
    // Backend will provision the usable slot automatically upon admin verification.
    setOrderPlaced(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Billing
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <span>App</span>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Billing</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout matching Screenshot 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Card: Add/Renew Slots (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          {/* Header & Duration Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Add/Renew Slots
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your slot subscriptions
              </p>
            </div>

            {/* Segmented Duration Tabs from dynamic active plans */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto max-w-full">
              {activePlans.map((plan) => {
                const isSelected = currentPlan.id === plan.id;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {plan.durationLabel || plan.period}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-right text-xs font-medium text-slate-400 dark:text-slate-500 -mt-3">
            *{currentPlan.storageGB || 10}GB video storage / slot
          </div>

          {/* Sub-tabs: Add Slots | Renew Slots */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('Add Slots')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'Add Slots'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Add Slots
            </button>
            <button
              onClick={() => setActiveTab('Renew Slots')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'Renew Slots'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Renew Slots
            </button>
          </div>

          {/* Slot item box matching Screenshot 3 */}
          {activeTab === 'Renew Slots' ? (
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentSlot.name}
                  </span>
                  <span className="text-xs font-semibold text-emerald-500">
                    Active
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  ID: {currentSlot.id}
                </span>
              </div>

              {/* Counter matching screenshot 3: '3 Months count :' [-] 1 [+] [x] */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {currentPlan.durationLabel || currentPlan.period} count :
                </span>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setRenewCount(Math.max(1, renewCount - 1))}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                    {renewCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRenewCount(renewCount + 1)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewCount(1)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  title="Reset count"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Add new slots item */
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  New Live Slot Subscription
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Includes 24/7 dedicated broadcast server + {currentPlan.storageGB || 10}GB storage
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  Slot count :
                </span>
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setAddCount(Math.max(1, addCount - 1))}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                    {addCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAddCount(addCount + 1)}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Included Features list */}
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
            <h5 className="text-xs font-bold text-[#6320ee] dark:text-[#a855f7] mb-2 uppercase tracking-wide">
              {currentPlan.title} Features ({currentPlan.durationLabel || currentPlan.period})
            </h5>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              {(currentPlan.features && currentPlan.features.length > 0
                ? currentPlan.features
                : ['24/7 Continuous loop streaming', `${currentPlan.storageGB || 10}GB Cloud video storage`, '1080p 60fps broadcast quality']
              ).map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Card: Order Details (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col gap-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Order Details
          </h3>

          <form onSubmit={handlePlaceOrder} className="flex flex-col gap-5">
            {/* Currency & Price Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Currency & Price
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium py-2.5 px-4 pr-10 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
                >
                  <option value="INR">INR (₹ Indian Rupee)</option>
                  <option value="USD">USD ($ United States Dollar)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Line items matching Screenshot 3 */}
            <div className="flex flex-col gap-3 py-2 border-y border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Selected Plan</span>
                <span className="font-semibold text-slate-900 dark:text-white text-right">
                  {currentPlan.title} ({currentPlan.durationLabel || currentPlan.period})
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Rate</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {currency === 'INR' ? `₹${unitPrice}.00` : `$${unitPrice}.00`} / slot
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Slots</span>
                <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                  {currentCount} × {currency === 'INR' ? `₹${unitPrice}.00` : `$${unitPrice}.00`} {currency}
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white">
                <span>Total</span>
                <span className="tabular-nums text-[#6320ee] dark:text-[#a855f7]">
                  {currency === 'INR' ? `₹${totalPrice}.00` : `$${totalPrice}.00`} {currency}
                </span>
              </div>
            </div>

            {/* Contact Details header */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Contact details
              </span>

              {/* Country & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Country*
                  </label>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium py-2.5 px-3 pr-8 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
                    >
                      <option value="India">🇮🇳 India</option>
                      <option value="United States">🇺🇸 United States</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom</option>
                      <option value="Canada">🇨🇦 Canada</option>
                      <option value="Australia">🇦🇺 Australia</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City*
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    placeholder="Mohali"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number*
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300 select-none">
                    {phoneCode}
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                    placeholder="88470 57896"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Place Order Button matching Screenshot 3 */}
            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-md transition-all cursor-pointer mt-2"
            >
              Place Order
            </button>

            {/* Help / Contact link */}
            <div className="text-center text-xs text-slate-500 dark:text-slate-400">
              Facing issue with the order?{' '}
              <button
                type="button"
                onClick={onOpenContact}
                className="text-[#6320ee] dark:text-[#a855f7] font-semibold hover:underline cursor-pointer"
              >
                Contact us
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {orderPlaced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {activeTab === 'Renew Slots' ? 'Renewal Request Submitted!' : 'Payment Submitted for Verification!'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeTab === 'Renew Slots'
                ? `Thank you, ${user.name}! Your renewal payment has been submitted (UTR: ${submittedUtr}). Once verified by admin, your slot validity will be extended.`
                : `Thank you, ${user.name}! Your payment for ${addCount} live slot (${currentPlan.durationLabel || currentPlan.period}) has been submitted (UTR: ${submittedUtr}). Once verified by admin, your usable slot will be created automatically.`}
            </p>

            <div className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs flex flex-col gap-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currentPlan.title} ({currentPlan.durationLabel || currentPlan.period})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {currency === 'INR' ? `₹${totalPrice}.00` : `$${totalPrice}.00`} {currency}
                </span>
              </div>
              {submittedUtr && (
                <div className="flex justify-between">
                  <span className="text-slate-500">UTR / Ref:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{submittedUtr}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{phoneCode} {phone}</span>
              </div>
            </div>

            <button
              onClick={() => setOrderPlaced(false)}
              className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-colors cursor-pointer mt-2"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal (UPI QR, GPay, Paytm, Razorpay & UTR Submission) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        planTitle={`${currentPlan.title} (${currentPlan.durationLabel || currentPlan.period})${currentCount > 1 ? ` - ${currentCount} slots` : ''}`}
        planId={currentPlan.id || currentPlan.period}
        slotId={activeTab === 'Renew Slots' ? currentSlot.id : undefined}
        amount={totalPrice}
        currency={currency}
        user={user}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
