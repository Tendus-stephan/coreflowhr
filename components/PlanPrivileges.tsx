import React from 'react';
import { Check } from 'lucide-react';

interface PlanPrivilegesProps {
  currentPlan?: string | null;
  showComparison?: boolean;
}

const PROFESSIONAL_FEATURES = [
  'Unlimited active jobs',
  'Up to 100 sourced candidates per job (PDL)',
  'AI match scoring for all sourced candidates',
  'Email workflows — automated follow-ups',
  'CSV export — all candidates',
  'Advanced analytics & reports',
  'Team collaboration — unlimited members',
  'eSignature for offer letters',
  'CV / resume parsing',
  'Priority support',
];

export const PlanPrivileges: React.FC<PlanPrivilegesProps> = ({ showComparison = false }) => {
  if (showComparison) {
    // Single plan — no comparison needed
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">CoreflowHR Professional — Everything included</h3>
        <ul className="space-y-2">
          {PROFESSIONAL_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">Your Professional Plan Privileges</h3>
        <ul className="space-y-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
          {PROFESSIONAL_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
