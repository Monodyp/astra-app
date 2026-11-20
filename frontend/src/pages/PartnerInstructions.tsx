import React from 'react';
import { PageHeading } from '../components/portal/PageHeading.js';
import { Panel } from '../components/portal/Panel.js';

export const PartnerInstructions: React.FC = () => (
  <div className="space-y-6">
    <PageHeading
      title="Partner Instructions"
      description="Steps for partner staff who accept ASTRA vouchers."
    />
    <Panel className="space-y-2 px-6 py-5">
      <p>This guide for partner staff is not published in the app yet.</p>
      <p className="text-sm text-astra-gray">
        Verification steps and partner terms need to come from ASTRA officers,
        so none are invented here.
      </p>
    </Panel>
  </div>
);
