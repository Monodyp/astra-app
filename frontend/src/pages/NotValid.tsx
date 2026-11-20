import React from 'react';
import { Link } from 'react-router-dom';
import { Panel, PageTitle, btnSecondary } from '@/components/member/ui';

export const NotValid: React.FC = () => (
  <div className="space-y-4">
    <PageTitle>Membership not valid</PageTitle>
    <Panel className="space-y-3">
      <p>This notice appears when annual dues are unpaid or a membership has lapsed.</p>
      <p className="text-astra-gray">
        Payment instructions and renewal officer contacts have not been published to this app yet, so none are shown here rather than guessing. Ask an ASTRA officer, or watch the ASTRA Discord and Facebook pages for renewal announcements.
      </p>
    </Panel>
    <Link to="/id" className={btnSecondary}>Back to Digital ID</Link>
  </div>
);
