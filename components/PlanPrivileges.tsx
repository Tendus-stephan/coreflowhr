import React from 'react';
import { Check, X } from 'lucide-react';
import { PLAN_LIMITS, PlanName, getPlanLimits } from '../services/planLimits';

interface PlanPrivilegesProps {
  currentPlan?: string | null;
  showComparison?: boolean;
}

export const PlanPrivileges: React.FC<PlanPrivilegesProps> = ({ 
  currentPlan, 
  showComparison = false 
}) => {
  const currentPlanLimits = getPlanLimits(currentPlan);

  if (showComparison) {
    // Show comparison table
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-900">Plan Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 text-sm font-bold text-gray-900">Feature</th>
                <th className="text-center p-3 text-sm font-bold text-gray-900">Basic</th>
                <th className="text-center p-3 text-sm font-bold text-gray-900">Professional</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Active Jobs</td>
                <td className="p-3 text-sm text-center text-gray-900">5</td>
                <td className="p-3 text-sm text-center text-gray-900 font-bold">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Candidates per Job</td>
                <td className="p-3 text-sm text-center text-gray-900">50</td>
                <td className="p-3 text-sm text-center text-gray-900 font-bold">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Candidates per Month</td>
                <td className="p-3 text-sm text-center text-gray-900">500</td>
                <td className="p-3 text-sm text-center text-gray-900 font-bold">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Sourcing Sources</td>
                <td className="p-3 text-sm text-center text-gray-900">LinkedIn, GitHub</td>
                <td className="p-3 text-sm text-center text-gray-900 font-bold">All Sources</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">AI Analysis</td>
                <td className="p-3 text-sm text-center">
                  <Check size={16} className="text-green-600 mx-auto" />
                </td>
                <td className="p-3 text-sm text-center">
                  <Check size={16} className="text-green-600 mx-auto" />
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Advanced Analytics</td>
                <td className="p-3 text-sm text-center">
                  <X size={16} className="text-gray-400 mx-auto" />
                </td>
                <td className="p-3 text-sm text-center">
                  <Check size={16} className="text-green-600 mx-auto" />
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 text-sm text-gray-700">Team Collaboration</td>
                <td className="p-3 text-sm text-center">
                  <X size={16} className="text-gray-400 mx-auto" />
                </td>
                <td className="p-3 text-sm text-center">
                  <Check size={16} className="text-green-600 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-gray-700">Priority Support</td>
                <td className="p-3 text-sm text-center">
                  <X size={16} className="text-gray-400 mx-auto" />
                </td>
                <td className="p-3 text-sm text-center">
                  <Check size={16} className="text-green-600 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show current plan privileges
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">
          Your {currentPlanLimits.name} Plan Privileges
        </h3>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Candidates per Job</span>
            <span className="text-sm font-bold text-gray-900">
              {currentPlanLimits.maxCandidatesPerJob === 'Unlimited' 
                ? 'Unlimited' 
                : currentPlanLimits.maxCandidatesPerJob}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Active Jobs</span>
            <span className="text-sm font-bold text-gray-900">
              {currentPlanLimits.maxActiveJobs === 'Unlimited' 
                ? 'Unlimited' 
                : currentPlanLimits.maxActiveJobs}
            </span>
          </div>
          {currentPlanLimits.maxCandidatesPerMonth && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Candidates per Month</span>
              <span className="text-sm font-bold text-gray-900">
                {currentPlanLimits.maxCandidatesPerMonth === 'Unlimited' 
                  ? 'Unlimited' 
                  : currentPlanLimits.maxCandidatesPerMonth}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Sourcing Sources</span>
            <span className="text-sm font-bold text-gray-900">
              {currentPlanLimits.sourcingSources.join(', ')}
            </span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-900 mb-2">Features</h4>
        <ul className="space-y-2">
          {currentPlanLimits.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

