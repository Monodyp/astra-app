import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AstrascendLayout } from '../components/AstrascendLayout';
import { LandingPage } from '../pages/LandingPage';
import { FacebookIcon, FacebookLink } from '../components/FacebookLink';

describe('Landing Page Partners and Footer Social Links', () => {
    it('renders the NEX logo in the partnership section', () => {
        render(
            <MemoryRouter initialEntries={['/astrascend']}>
                <Routes>
                    <Route path="/astrascend" element={<AstrascendLayout />}>
                        <Route index element={<LandingPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>,
        );

        const nexImg = screen.getByAltText('NEX');
        expect(nexImg).toBeTruthy();
        expect(nexImg.getAttribute('src')).toMatch(/Nex_logo_dark/);

        expect(screen.queryByText(/Partner [2-5]/)).toBeNull();
    });

    it('renders Facebook and Discord icons in the footer', () => {
        render(
            <MemoryRouter initialEntries={['/astrascend']}>
                <Routes>
                    <Route path="/astrascend" element={<AstrascendLayout />}>
                        <Route index element={<LandingPage />} />
                    </Route>
                </Routes>
            </MemoryRouter>,
        );

        const footer = document.querySelector('footer');
        expect(footer).toBeTruthy();

        const fbLink = footer?.querySelector('a[aria-label*="Facebook"]');
        expect(fbLink).toBeTruthy();
        expect(fbLink?.getAttribute('href')).toMatch(/facebook\.com/);

        const discordLink = footer?.querySelector('a[aria-label*="Discord"]');
        expect(discordLink).toBeTruthy();
    });

    it('renders FacebookLink with correct attributes', () => {
        render(
            <FacebookLink className="custom-class">
                <FacebookIcon className="h-6 w-6" />
            </FacebookLink>,
        );

        const link = screen.getByLabelText(/Facebook/i);
        expect(link.getAttribute('href')).toMatch(/facebook\.com/);
        expect(link.getAttribute('target')).toBe('_blank');
    });
});
