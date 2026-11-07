import React from 'react';
import { X, Play, Key, Upload, Radio, CheckCircle, ExternalLink } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToSlots: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onGoToSlots,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: '01',
      title: 'Get your YouTube Stream Key',
      desc: 'Open YouTube Studio, click "Create" > "Go Live". In Stream Settings, copy your unique Stream Key. (No passwords or account access required!)',
      icon: Key,
    },
    {
      num: '02',
      title: 'Upload your Pre-Recorded Video',
      desc: 'Go to the Videos tab in Stream LIVE and upload your MP4 video (up to 2GB) or choose one of our copyright-free 24/7 stream loops.',
      icon: Upload,
    },
    {
      num: '03',
      title: 'Configure Your Live Slot',
      desc: 'In Live Slots, select your slot. Paste your Stream Key, choose YouTube as platform, turn on "Stream Loop" for 24/7 non-stop repeating, and select your video.',
      icon: Radio,
    },
    {
      num: '04',
      title: 'Click "Start Stream" & Relax!',
      desc: 'Hit Start Stream! Our cloud nodes immediately establish an RTMP connection with YouTube. You can turn off your PC, laptop, or phone—the stream stays live 24/7.',
      icon: Play,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              How to Stream 24/7 on YouTube
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Step-by-step tutorial to broadcast pre-recorded videos with Stream LIVE.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="overflow-y-auto flex flex-col gap-4 pr-1">
          {steps.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.num}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#6320ee] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {st.num}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#6320ee]" />
                    <span>{st.title}</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Need hands-on assistance? Our support team is active 24/7.
          </span>
          <button
            onClick={() => {
              onClose();
              onGoToSlots();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#6320ee] hover:bg-[#5218cc] shadow-xs cursor-pointer transition-colors"
          >
            Configure My Slot Now
          </button>
        </div>
      </div>
    </div>
  );
};
