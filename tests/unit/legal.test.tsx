import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp } from '../renderApp';
import i18n from '../../src/app/i18n';
import { BUSINESS } from '../../src/config/business';

describe('legal pages', () => {
  it.each([
    ['/terms', 'Terms of use'],
    ['/privacy', 'Privacy policy'],
    ['/refunds', 'Refunds and cancellation'],
    ['/contact', 'Contact'],
  ])('route %s shows heading "%s"', async (route, heading) => {
    await renderApp(route);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('footer links to every legal page and to Premium from any page', async () => {
    await renderApp('/');
    const footer = screen.getByRole('navigation', { name: 'Site information' });
    for (const [name, href] of [
      ['Premium', '/premium'],
      ['Terms of use', '/terms'],
      ['Privacy policy', '/privacy'],
      ['Refunds and cancellation', '/refunds'],
      ['Contact', '/contact'],
    ]) {
      expect(within(footer).getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('refund page states the 7-day rule and that nothing is shipped', async () => {
    await renderApp('/refunds');
    expect(screen.getByText(/full refund within 7 days of purchase/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing is shipped/)).toBeInTheDocument();
  });

  it('terms name the seller and leave no unfilled placeholders', async () => {
    const { container } = await renderApp('/terms');
    expect(screen.getByText(new RegExp(`THE WORD \\(വചനം\\) is run by ${BUSINESS.legalName}`))).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\{\{|\[OWNER/);
  });

  it('contact page shows name, address, email and phone', async () => {
    await renderApp('/contact');
    expect(screen.getByText(BUSINESS.address)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: BUSINESS.email })).toHaveAttribute('href', `mailto:${BUSINESS.email}`);
    expect(screen.getByRole('link', { name: BUSINESS.phoneDisplay })).toHaveAttribute('href', BUSINESS.phoneHref);
  });

  it('renders in Malayalam with no unfilled placeholders', async () => {
    const { container } = await renderApp('/privacy');
    await i18n.changeLanguage('ml');
    expect(await screen.findByRole('heading', { level: 1, name: 'സ്വകാര്യതാ നയം' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\{\{/);
    await i18n.changeLanguage('en');
  });
});
