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
