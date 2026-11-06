import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../renderApp';
import { LANGUAGE_STORAGE_KEY, readStoredLanguage } from '../../src/app/i18n';

describe('application shell', () => {
  it('renders desktop and mobile navigation with all five sections', async () => {
    await renderApp('/');
    const navs = screen.getAllByRole('navigation', { name: 'Main navigation' });
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      for (const label of ['Home', 'Bible', 'Ask the Word', 'Discover', 'My Journey']) {
        expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
      }
    }
  });

  it('provides a skip link to the main content', async () => {
    await renderApp('/');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
  });

  it.each([
    ['/bible', 'Bible'],
    ['/ask', 'Ask the Word'],
    ['/discover', 'Discover'],
    ['/login', 'Sign in'],
    ['/register', 'Create your account'],
    ['/forgot-password', 'Reset your password'],
    ['/reset-password', 'Choose a new password'],
    ['/nowhere', 'Page not found'],
  ])('route %s shows heading "%s"', async (route, heading) => {
    await renderApp(route);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('never shows Bible text while no licensed provider is connected', async () => {
    await renderApp('/bible');
    expect(screen.getByText("Bible text isn't connected yet")).toBeInTheDocument();
  });

  it('keeps the Ask the Word form disabled until the backend exists', async () => {
    await renderApp('/ask');
    expect(screen.getByRole('textbox', { name: 'Your question' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });
});

describe('language switching', () => {
  it('switches to Malayalam, updates <html lang> and persists the choice', async () => {
    const user = userEvent.setup();
    await renderApp('/');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ml');

    expect(await screen.findByRole('heading', { level: 1, name: 'സ്വാഗതം' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ml');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ml');
    expect(readStoredLanguage()).toBe('ml');
  });

  it('ignores a stored language that is not enabled', () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ta');
    expect(readStoredLanguage()).toBe('en');
  });

  it('only offers enabled languages', async () => {
    await renderApp('/');
    const options = within(screen.getByRole('combobox', { name: 'Language' })).getAllByRole('option');
    expect(options.map((o) => o.getAttribute('value'))).toEqual(['en', 'ml']);
  });
});

describe('protected routes', () => {
  it('sends signed-out visitors from My Journey to sign in', async () => {
    await renderApp('/journey');
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });

  it('treats a reset link without a recovery session as invalid', async () => {
    await renderApp('/reset-password');
    expect(screen.getByText(/invalid or has expired/)).toBeInTheDocument();
  });
});

describe('auth forms without Supabase', () => {
  it('shows validation errors in the current language', async () => {
    const user = userEvent.setup();
    await renderApp('/login');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('tells the user accounts are not connected instead of faking success', async () => {
    const user = userEvent.setup();
    await renderApp('/login');
    await user.type(screen.getByLabelText('Email'), 'reader@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Accounts aren't connected yet/);
  });
});
