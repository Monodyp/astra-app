import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ServiceFields } from '../../forms/ServiceFields';
import { createEmptyDrafts } from '../../forms/RequestState';
import { requestExamples } from '../../submission/requestExamples';
import { upshift } from '../../forms/serviceFields/upshift';

afterEach(cleanup);
describe('UPSHIFT', () => {
    it('renders learning, experience, format, goal, participants and schedule fields', () => {
        render(
            <ServiceFields
                definition={upshift}
                draft={createEmptyDrafts().upshift}
                onChange={vi.fn()}
            />,
        );
        expect(screen.getAllByRole('combobox')).toHaveLength(3);
        expect(screen.getAllByRole('textbox')).toHaveLength(4);
        fireEvent.click(
            screen.getByRole('combobox', {
                name: 'What type of learning support are you looking for?',
            }),
        );
        expect(
            screen.getByRole('option', { name: 'Technical consultation' }),
        ).toBeDefined();
        fireEvent.click(
            screen.getByRole('combobox', { name: 'Your current experience' }),
        );
        expect(
            screen.getByRole('option', { name: 'Not sure yet' }),
        ).toBeDefined();
    });
    it('requires support type, topic and goal without requiring optional experience', () => {
        expect(
            Object.keys(upshift.validate(createEmptyDrafts().upshift)),
        ).toEqual([
            'details.learningSupportType',
            'details.topic',
            'details.goal',
        ]);
    });
    it('preserves the complete example and flexible scheduling text', () => {
        const sample = requestExamples.upshift;
        const payload = upshift.buildRequest(
            {
                ...sample.requester,
                organization: sample.requester.organization,
            },
            true,
            { ...createEmptyDrafts().upshift, ...sample.details },
        );
        expect(payload).toEqual(sample);
        expect(payload.details.preferredSchedule).toBe('A weekend in November');
        expect(
            upshift.validate({
                ...createEmptyDrafts().upshift,
                ...sample.details,
                preferredFormat: 'invalid',
            }),
        ).toHaveProperty('details.preferredFormat');
    });
});
