import React, { useState } from 'react';
import { X, Check, FileText } from 'lucide-react';

export default function BankSelectionModal({ banks, selectedBankIds, onToggleBank, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-[550px] w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="bg-[#f6ebd8] px-6 py-4 flex justify-between items-center border-b border-orange-200/60 shrink-0">
          <h2 className="text-xl font-bold text-[#e65c00]">Select Question Banks</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bank List */}
        <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
          {banks && banks.length > 0 ? (
            banks.map((bank) => {
              const isSelected = selectedBankIds.includes(bank.id);
              return (
                <div
                  key={bank.id}
                  onClick={() => onToggleBank(bank)}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-orange-50 border-[#e65c00] shadow-xs'
                      : 'bg-white border-gray-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-[#e65c00] text-white' : 'bg-gray-100 text-slate-600'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{bank.name || bank.title}</h4>
                      <p className="text-xs text-slate-500">{bank.questions?.length || 0} Questions</p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-[#e65c00] border-[#e65c00] text-white' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs font-medium">
              No Question Banks available. Upload a PDF first!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-[#1a2b4c] text-white rounded-xl text-xs font-bold hover:bg-[#111e36]"
          >
            Done ({selectedBankIds.length} Selected)
          </button>
        </div>

      </div>
    </div>
  );
}
