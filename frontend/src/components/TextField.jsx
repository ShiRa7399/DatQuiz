import React from 'react';

export default function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  icon: Icon = null,
  maxLength,
  uppercase = false,
  required = false,
  maxLengthIndicator = false,
  className = ''
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-orange-700">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-orange-700 pointer-events-none flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => {
            const val = uppercase ? e.target.value.toUpperCase() : e.target.value;
            onChange(val);
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          className={`w-full h-14 bg-white border border-gray-300 rounded-lg px-4 ${
            Icon ? 'pl-12' : ''
          } ${
            maxLengthIndicator ? 'pr-14' : ''
          } text-base text-slate-900 ${
            uppercase ? 'uppercase tracking-widest font-bold' : 'font-medium'
          } focus:outline-none focus:border-orange-700 focus:border-2 focus:ring-0 transition-all`}
        />
        {maxLengthIndicator && maxLength && (
          <span className="absolute right-4 text-xs font-bold text-gray-400">
            {value ? value.length : 0}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
