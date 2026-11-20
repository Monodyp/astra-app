import React from 'react';
import { Panel, PageTitle } from '@/components/member/ui';

export const PartnerInstructions: React.FC = () => (
  <div className="space-y-4">
    <PageTitle>Partner Instructions</PageTitle>
    <Panel className="space-y-2">
      <p>This guide for partner staff is not published in the app yet.</p>
      <p className="text-sm text-astra-gray">
        Verification steps and partner terms need to come from ASTRA officers, so none are invented here.
      </p>
    </Panel>
  </div>
);
