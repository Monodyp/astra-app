import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '../App.js';

describe('Frontend Smoke Test', () => {
  it('renders App skeleton without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
    expect(container.textContent).toContain(
      'One App for Your Student Developer Journey.',
    );
  });
});
