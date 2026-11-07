import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  CreditCard,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { PaymentGatewayConfig, UserProfile } from '../types';
import { fetchPaymentGateways, uploadPaymentProof, submitPaymentUtr } from '../lib/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTitle: string;
  planId: string;
  slotId?: string;
  amount: number;
  currency: 'INR' | 'USD';
  user: UserProfile;
  onSuccess: (utrNumber: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  planTitle,
  planId,
  slotId,
  amount,
  currency,
  user,
  onSuccess,
}) => {
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('upi');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitted(false);
      setUtrNumber('');
      setProofFile(null);
      setProofPreview(null);
      fetchPaymentGateways()
        .then((g) => {
          setGateways(g);
          if (g.length > 0 && !g.find((gw) => gw.id === selectedGatewayId)) {
            setSelectedGatewayId(g[0].id);
          }
        })
        .catch(() => {
          // fallback default
          setGateways([
            {
              id: 'upi',
              name: 'UPI Dynamic QR & Intent',
              isEnabled: true,
              mode: 'manual',
              upiId: 'streamlive@upi',
              merchantName: 'Stream LIVE',
              autoVerify: false,
            },
          ]);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentGateway = gateways.find((g) => g.id === selectedGatewayId) || gateways[0] || {
    id: 'upi',
    name: 'UPI QR',
    upiId: 'streamlive@upi',
    merchantName: 'Stream LIVE',
    mode: 'manual',
    autoVerify: false,
  };

  const cleanUpiId = currentGateway.upiId || 'streamlive@upi';
  const cleanMerchant = currentGateway.merchantName || 'Stream LIVE';
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(cleanMerchant)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Stream LIVE ${planTitle}`)}`;
  const qrCodeUrl = currentGateway.qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiIntentUrl)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(cleanUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI UTR / Transaction Reference number');
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl: string | undefined = undefined;
      if (proofFile) {
        proofUrl = await uploadPaymentProof(proofFile);
      }

      const res = await submitPaymentUtr({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        planId,
        slotId,
        amount,
        currency,
        gatewayType: currentGateway.id,
        utrNumber: cleanUtr,
        proofImageUrl: proofUrl,
      });

      setIsSubmitted(true);
      setSubmissionMessage(res.message);
      onSuccess(cleanUtr);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit payment details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#6320ee]/10 dark:bg-[#6320ee]/20 text-[#6320ee] dark:text-[#a855f7] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Payment Checkout
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {planTitle} • <span className="font-bold text-[#6320ee] dark:text-[#a855f7]">{currency === 'INR' ? `₹${amount}` : `$${amount}`}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          /* Success Screen */
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">
              Payment Submitted!
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
              {submissionMessage}
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 w-full text-xs flex justify-between">
              <span className="text-slate-500">Submitted UTR Reference:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{utrNumber}</span>
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] transition-all cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Gateway Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {gateways.map((gw) => (
                  <button
                    type="button"
                    key={gw.id}
                    onClick={() => setSelectedGatewayId(gw.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      selectedGatewayId === gw.id
                        ? 'border-[#6320ee] bg-purple-50/50 dark:bg-purple-950/30 text-[#6320ee] dark:text-[#a855f7] shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {gw.id === 'upi' ? (
                      <QrCode className="w-4 h-4" />
                    ) : gw.id === 'gpay' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : gw.id === 'paytm' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span className="capitalize truncate w-full text-center">{gw.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code & Transfer Details */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100">
                  <img
                    src={qrCodeUrl}
                    alt="UPI QR Code"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Scan with any UPI App</span>
              </div>

              <div className="flex-1 flex flex-col gap-2.5 w-full">
                <div>
                  <span className="text-[11px] text-slate-400 block">Pay to Merchant:</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{cleanMerchant}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">UPI ID:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono font-semibold text-[#6320ee] dark:text-[#a855f7] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 select-all">
                      {cleanUpiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#6320ee] transition-colors cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">Amount to Pay:</span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{amount}.00 INR
                  </span>
                </div>

                <a
                  href={upiIntentUrl}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6320ee] dark:text-[#a855f7] hover:underline"
                >
                  <span>Pay directly via UPI App</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Step 2: UTR Number Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Enter 12-Digit UTR / Reference ID*</span>
                <span className="text-[11px] font-normal text-slate-400">Found in payment receipt</span>
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="e.g. 431289056712"
                maxLength={20}
                required
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
              />
            </div>

            {/* Optional Receipt Screenshot Upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Payment Screenshot / Receipt (Optional)</span>
                <span className="text-[11px] text-slate-400">Speeds up verification</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {proofFile ? proofFile.name : 'Choose receipt image / screenshot'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {proofPreview && (
                <div className="mt-1 flex items-center gap-2">
                  <img
                    src={proofPreview}
                    alt="Receipt Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  />
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Screenshot attached</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting & Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit UTR for Verification</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              Payments are verified automatically or confirmed by admin within 5 minutes.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

