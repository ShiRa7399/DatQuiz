import React from 'react';
import { ClipboardList, FileText, Trash2 } from 'lucide-react';

export default function ListTileCard({
  type = 'quiz', // 'quiz' | 'bank'
  title,
  subtitle,
  code,
  onManage,
  onDelete,
  className = ''
}) {
  if (type === 'quiz') {
    return (
      <div className={`bg-[#faebe0] border border-orange-200/60 rounded-xl p-3.5 flex items-center justify-between mb-3 shadow-xs ${className}`}>
        
        {/* Left Icon + Text */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e65c00] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Code: {code}</p>
          </div>
        </div>

        {/* Right Actions: Manage Button + Red Trash Can */}
        <div className="flex items-center gap-3">
          {onManage && (
            <button
              onClick={onManage}
              className="bg-[#e65c00] hover:bg-[#c85000] text-white font-bold text-sm px-5 py-1.5 rounded-xl shadow-xs transition-colors"
            >
              Manage
            </button>
          )}

          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete Quiz"
              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-100/50 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    );
  }

  // Question Bank Card Style
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-3.5 flex items-center justify-between mb-3 shadow-xs ${className}`}>
      
      {/* Left Icon + Text */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-[#e65c00] flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900 leading-tight">{title}</h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Delete Action */}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete Bank"
          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

    </div>
  );
}
