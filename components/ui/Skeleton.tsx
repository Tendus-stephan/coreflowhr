import React from 'react';

/** Base shimmer block */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
);

/** Dashboard page skeleton */
export const DashboardSkeleton: React.FC = () => (
  <div className="pt-8 px-8 pb-2 space-y-6 max-w-[1600px] mx-auto">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>

    {/* Main content row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-5 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <div className="border border-gray-100 rounded-2xl p-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Bottom row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Jobs page skeleton */
export const JobsSkeleton: React.FC = () => (
  <div className="pt-8 px-8 pb-8 max-w-[1600px] mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>

    {/* Filters */}
    <div className="flex gap-3">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>

    {/* Job cards */}
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right space-y-1">
                <Skeleton className="h-6 w-8 ml-auto" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Clients page skeleton */
export const ClientsSkeleton: React.FC = () => (
  <div className="pt-8 px-8 pb-8 max-w-[1600px] mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-px w-full bg-gray-100" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Offers page skeleton */
export const OffersSkeleton: React.FC = () => (
  <div className="pt-8 px-8 pb-8 max-w-[1600px] mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

/** Calendar page skeleton */
export const CalendarSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-white">
    <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <Skeleton className="h-9 w-32 rounded-xl" />
    </div>
    <div className="px-8 py-4 border-b border-gray-100 flex gap-2">
      <Skeleton className="h-8 w-28 rounded-lg" />
      <Skeleton className="h-8 w-28 rounded-lg" />
    </div>
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

/** Candidates (Kanban board) skeleton */
export const CandidateBoardSkeleton: React.FC = () => (
  <div className="flex flex-col bg-white min-h-full" style={{ height: '100%' }}>
    <div className="px-8 pt-8 pb-5 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
    <div className="flex-1 overflow-x-auto px-8 py-5">
      <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
        {[...Array(5)].map((_, col) => (
          <div key={col} className="w-64 flex flex-col gap-3 flex-shrink-0">
            <div className="flex items-center justify-between px-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
            {[...Array(col === 0 ? 4 : col === 1 ? 3 : 2)].map((_, j) => (
              <div key={j} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-white">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-3 w-20" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Reports page skeleton */
export const ReportsSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gray-50/40">
    <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white flex items-start justify-between gap-4 flex-shrink-0">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 bg-white space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-5 bg-white space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Settings page skeleton */
export const SettingsSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gray-50/40">
    <div className="px-8 pt-8 pb-5 border-b border-gray-100 bg-white">
      <Skeleton className="h-7 w-28" />
    </div>
    <div className="flex flex-1 overflow-hidden">
      <div className="w-52 border-r border-gray-100 bg-white p-4 space-y-1 flex-shrink-0">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-xl mt-2" />
      </div>
    </div>
  </div>
);
