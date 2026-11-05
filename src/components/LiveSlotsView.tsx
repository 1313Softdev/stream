import React, { useState } from 'react';
import {
  ChevronDown,
  Plus,
  RefreshCw,
  Eye,
  Play,
  Square,
  Trash2,
  Radio,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Slot } from '../types';
import { AppView } from './Sidebar';

interface LiveSlotsViewProps {
  slots: Slot[];
  onSelectSlot: (slot: Slot) => void;
  onNavigate: (view: AppView) => void;
  onToggleStream: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onAddSlot: (slotName: string, scheduleStart?: boolean, startTime?: string) => void;
}

export const LiveSlotsView: React.FC<LiveSlotsViewProps> = ({
  slots,
  onSelectSlot,
  onNavigate,
  onToggleStream,
  onDeleteSlot,
  onAddSlot,
}) => {
  const [filter, setFilter] = useState<string>('All Slots');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [slotToDelete, setSlotToDelete] = useState<Slot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newSlotName, setNewSlotName] = useState<string>(`Slot ${Date.now()}`);
  const [scheduleNewSlot, setScheduleNewSlot] = useState<boolean>(false);
  const [newSlotStartTime, setNewSlotStartTime] = useState<string>('October 30th, 2026 06:00 PM');

  const filteredSlots = slots.filter((slot) => {
    if (filter === 'All Slots') return true;
    if (filter === 'Active') return slot.status === 'active';
    if (filter === 'Expired') return slot.status === 'expired';
    if (filter === 'Inactive') return slot.status === 'inactive';
    if (filter === 'Live Streams') return slot.streamStatus === 'Live';
    if (filter === 'Scheduled Streams') return slot.streamStatus === 'Scheduled';
    return true;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredSlots.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotName.trim()) return;
    onAddSlot(newSlotName.trim(), scheduleNewSlot, newSlotStartTime);
    setNewSlotName(`Slot ${Date.now()}`);
    setScheduleNewSlot(false);
    setShowAddModal(false);
    setToastMessage(`Created new slot "${newSlotName.trim()}".`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteSlot = () => {
    if (!slotToDelete) return;
    const name = slotToDelete.name;
    onDeleteSlot(slotToDelete.id);
    setToastMessage(`Slot "${name}" was deleted.`);
    setTimeout(() => setToastMessage(null), 3500);
    setSlotToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Title & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Live Slots
          </h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 ml-4">
            <span>App</span>
            <span>&gt;</span>
            <span className="text-[#6320ee] dark:text-[#a855f7]">Live Slots</span>
          </div>
        </div>
      </div>

      {/* Heading & Subtitle matching Screenshot 6 */}
      <div className="flex flex-col gap-1">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Stream Your Prerecorded Video Now
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Just upload video, and boom! <span className="text-[#6320ee] dark:text-[#a855f7] font-semibold">Go Live</span> anywhere any time
        </p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Dropdown */}
        <div className="relative inline-block w-52">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium py-2.5 px-3.5 pr-8 rounded-lg shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#6320ee] cursor-pointer"
          >
            <option value="All Slots">All Slots</option>
            <option value="Active">Active</option>
            <option value="Live Streams">Live Streams (Streaming)</option>
            <option value="Scheduled Streams">Scheduled Streams</option>
            <option value="Expired">Expired</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slot</span>
          </button>
          <button
            onClick={() => onNavigate('billing')}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Renew Slots</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-4 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredSlots.length > 0 && selectedIds.length === filteredSlots.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">SLOT NAME</th>
                <th className="py-4 px-6">STATUS</th>
                <th className="py-4 px-6">STREAM</th>
                <th className="py-4 px-6">EXPIRE ON</th>
                <th className="py-4 px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No slots found matching the criteria. Click "Add Slot" to create one.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => {
                  const isChecked = selectedIds.includes(slot.id);
                  const isStreaming = slot.streamStatus === 'Live';

                  return (
                    <tr
                      key={slot.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(slot.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                        />
                      </td>

                      {/* Slot Name */}
                      <td className="py-4 px-6">
                        <button
                          onClick={() => onSelectSlot(slot)}
                          className="font-medium text-slate-900 dark:text-white hover:text-[#6320ee] dark:hover:text-[#a855f7] cursor-pointer transition-colors text-left"
                        >
                          {slot.name}
                        </button>
                        <div className="text-xs text-slate-400 font-mono">
                          ID: {slot.id.substring(0, 10)}...
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span className="text-emerald-500 dark:text-emerald-400 font-medium capitalize">
                          {slot.status}
                        </span>
                      </td>

                      {/* Stream */}
                      <td className="py-4 px-6">
                        {isStreaming ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        ) : slot.streamStatus === 'Scheduled' ? (
                          <span className="inline-flex items-center gap-1.5 text-[#6320ee] dark:text-[#a855f7] font-semibold text-xs">
                            <CalendarClock className="w-3.5 h-3.5 animate-pulse" />
                            <span>Scheduled</span>
                          </span>
                        ) : (
                          <span className="text-red-500 font-medium">
                            Off
                          </span>
                        )}
                      </td>

                      {/* Expire On */}
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-300 tabular-nums">
                        {slot.expireOn}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick Stream toggle */}
                          <button
                            onClick={() => onToggleStream(slot.id)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isStreaming
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40'
                                : slot.streamStatus === 'Scheduled'
                                ? 'bg-purple-100 text-[#6320ee] hover:bg-purple-200 dark:bg-purple-950/60 dark:text-[#a855f7]'
                                : 'bg-purple-50 text-[#6320ee] hover:bg-purple-100 dark:bg-purple-950/40 dark:text-[#a855f7]'
                            }`}
                            title={isStreaming ? "Stop Live Stream" : slot.streamStatus === 'Scheduled' ? "Launch Scheduled Stream Now" : "Start Live Stream"}
                          >
                            {isStreaming ? (
                              <Square className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                          </button>

                          {/* View details */}
                          <button
                            onClick={() => onSelectSlot(slot)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="View / Edit Slot Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setSlotToDelete(slot)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete Slot"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Add New Live Slot
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Create a dedicated 24/7 cloud streaming slot for your videos.
              </p>
            </div>

            <form onSubmit={handleCreateSlotSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Slot Name
                </label>
                <input
                  type="text"
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6320ee]"
                  placeholder="e.g. Slot 1793129948103"
                  required
                />
              </div>

              {/* Schedule Stream Start option in modal */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-[#6320ee]" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Schedule Stream Start
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={scheduleNewSlot}
                    onChange={(e) => setScheduleNewSlot(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#6320ee] focus:ring-[#6320ee] cursor-pointer"
                  />
                </div>

                {scheduleNewSlot && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">
                      Start Date & Time:
                    </label>
                    <input
                      type="text"
                      value={newSlotStartTime}
                      onChange={(e) => setNewSlotStartTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                      placeholder="October 30th, 2026 06:00 PM"
                    />
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-xs text-[#6320ee] dark:text-[#a855f7] flex flex-col gap-1">
                <span className="font-semibold">Included in this slot:</span>
                <span>• 24/7 Automated stream server</span>
                <span>• Unlimited loops with zero buffering</span>
                <span>• 4GB Dedicated video storage</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#6320ee] hover:bg-[#5218cc] rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Create Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Slot In-App Confirmation Modal */}
      {slotToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 stroke-2" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete Live Slot?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete this live slot?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {slotToDelete.name}
                </span>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                  {slotToDelete.status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Expires: {slotToDelete.expireOn}</span>
                <span>·</span>
                <span>Platform: {slotToDelete.platform}</span>
              </div>
            </div>

            {slots.length <= 1 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice: This is your only active slot. You can add more slots anytime.</span>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Deleting this slot will immediately terminate any ongoing broadcast and release the allocated 24/7 cloud server.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSlotToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSlot}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Slot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
