import React from 'react';

interface DemoSelectorHeaderProps {
  icon: React.ReactNode;
  heading: string;
  badgeText: string;
  badgeVariant: 'farmer' | 'staff';
  description: string;
}

export const DemoSelectorHeader: React.FC<DemoSelectorHeaderProps> = ({
  icon,
  heading,
  badgeText,
  badgeVariant,
  description
}) => {
  const isFarmer = badgeVariant === 'farmer';

  const headerBg = isFarmer
    ? 'bg-gradient-to-r from-emerald-50/70 via-slate-50/50 to-white border-b border-emerald-100'
    : 'bg-gradient-to-r from-slate-100/70 via-slate-50/50 to-white border-b border-slate-200/80';

  const badgeStyles = isFarmer
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div
      className={`grid grid-cols-[40px_1fr_108px] md:grid-cols-[40px_210px_108px_1fr] items-center gap-x-3 gap-y-2 px-3.5 py-3 sm:px-4 sm:py-3 select-none ${headerBg}`}
    >
      {/* 1. Icon: fixed width (40px) */}
      <div className="w-[40px] h-[40px] flex items-center justify-center shrink-0 text-xl">
        {icon}
      </div>

      {/* 2. Heading: fixed or controlled width (210px) */}
      <div className="w-full md:w-[210px] min-w-0">
        <h3 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight leading-snug line-clamp-2 md:line-clamp-none break-words">
          {heading}
        </h3>
      </div>

      {/* 3. Account Badge: fixed width (108px) */}
      <div className="w-[108px] flex items-center justify-center shrink-0">
        <span
          className={`w-[108px] h-6 flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-center shrink-0 border ${badgeStyles}`}
        >
          {badgeText}
        </span>
      </div>

      {/* 4. Description: remaining available width on desktop, below on mobile */}
      <div className="col-span-3 md:col-span-1 min-w-0 pl-1 md:pl-0">
        <p className="text-[11px] text-slate-500 leading-tight break-words">
          {description}
        </p>
      </div>
    </div>
  );
};
