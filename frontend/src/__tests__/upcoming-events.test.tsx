import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import UpcomingEvents from '../components/home/upcoming-events';

afterEach(cleanup);

describe('upcoming events', () => {
  it.each([
    { label: 'omitted', events: undefined },
    { label: 'empty', events: [] },
  ])(
    'shows the empty state when events are $label',
    ({ events }) => {
      render(<UpcomingEvents events={events} />);

      expect(screen.getByRole('status').textContent).toContain('No upcoming events yet');
      expect(screen.queryByRole('link', { name: 'Event details' })).toBeNull();
    },
  );

  it('shows supplied events with their registration links', () => {
    render(<UpcomingEvents events={[{
      id: 'frontend-workshop',
      title: 'Frontend Workshop',
      description: 'Build a responsive page together.',
    }]} />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Frontend Workshop' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Event details' }).getAttribute('href'))
      .toBe('/events/frontend-workshop');
  });
});
