import React from 'react';

const serviceRequestUrl = import.meta.env.VITE_FORM_REQUEST_SERVICE_URL || '/astrascend/request';
const partnershipUrl = import.meta.env.VITE_FORM_PARTNERSHIP_URL || '#';
const opportunitiesUrl = import.meta.env.VITE_FORM_OPPORTUNITIES_URL || '#';

export const Opportunities: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Opportunities</h2>
      <p className="text-sm text-slate-400">
        External forms for service requests, partnerships, and developer opportunities.
      </p>

      <div className="flex flex-col gap-3 pt-2">
        <a
          href={serviceRequestUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-center text-xs font-semibold text-white transition-colors"
        >
          Request ASTRA Service
        </a>
        {partnershipUrl === '#' && <p className="text-xs text-amber-300">The partnership form link has not been configured yet.</p>}
        <a
          href={partnershipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-center text-xs font-semibold text-slate-200 transition-colors"
        >
          Partner With ASTRA
        </a>
        {opportunitiesUrl === '#' && <p className="text-xs text-amber-300">The opportunities form link has not been configured yet.</p>}
        <a
          href={opportunitiesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-center text-xs font-semibold text-slate-200 transition-colors"
        >
          Apply for Opportunities
        </a>
      </div>

    </div>
  );
};
