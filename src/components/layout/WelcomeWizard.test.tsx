import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// jsdom never "finishes" framer-motion's exit animation, so AnimatePresence
// mode="wait" would keep the next step unmounted. Render motion elements plainly
// and let AnimatePresence pass its children straight through.
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough =
    (Tag: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ children, initial, animate, exit, transition, whileTap, whileHover, layout, ...rest }: any) =>
      React.createElement(Tag, rest, children);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    motion: new Proxy({}, { get: (_t, tag: string) => passthrough(tag) }),
  };
});
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import en from '@/i18n/locales/en.json';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  WelcomeWizard,
  welcomeFinishPatch,
  clampStep,
  WELCOME_STEPS,
} from './WelcomeWizard';

// A self-contained i18n instance so tests don't depend on app bootstrap.
const testI18n = i18next.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

function renderWizard() {
  return render(
    <I18nextProvider i18n={testI18n}>
      <WelcomeWizard />
    </I18nextProvider>
  );
}

afterEach(cleanup);

describe('welcomeFinishPatch', () => {
  it('always retires the welcome and inline onboarding', () => {
    expect(welcomeFinishPatch(true)).toMatchObject({
      welcomeSeen: true,
      onboardingSeen: true,
    });
    expect(welcomeFinishPatch(false)).toMatchObject({
      welcomeSeen: true,
      onboardingSeen: true,
    });
  });

  it('carries the autostart choice through', () => {
    expect(welcomeFinishPatch(true).launchOnLogin).toBe(true);
    expect(welcomeFinishPatch(false).launchOnLogin).toBe(false);
  });
});

describe('clampStep', () => {
  it('clamps below zero to the first step', () => {
    expect(clampStep(-3)).toBe(0);
  });
  it('clamps past the end to the last step', () => {
    expect(clampStep(99)).toBe(WELCOME_STEPS - 1);
  });
  it('passes valid indices through', () => {
    expect(clampStep(1)).toBe(1);
  });
});

describe('WelcomeWizard', () => {
  beforeEach(() => {
    // A resolved stub so finishing never touches the Tauri store in tests.
    useSettingsStore.setState({ updateSettings: vi.fn().mockResolvedValue(undefined) });
  });

  it('opens on the first step', () => {
    renderWizard();
    expect(screen.getByText(en['welcome.step1.title'])).toBeInTheDocument();
  });

  it('advances through every step to the final CTA', () => {
    renderWizard();
    fireEvent.click(screen.getByText(en['welcome.next']));
    expect(screen.getByText(en['welcome.step2.title'])).toBeInTheDocument();
    fireEvent.click(screen.getByText(en['welcome.next']));
    expect(screen.getByText(en['welcome.step3.title'])).toBeInTheDocument();
    // Last step swaps "Next" for the finish CTA.
    expect(screen.getByText(en['welcome.getStarted'])).toBeInTheDocument();
    expect(screen.queryByText(en['welcome.next'])).not.toBeInTheDocument();
  });

  it('persists the finish patch with autostart on by default', () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({ updateSettings: patch });
    renderWizard();
    fireEvent.click(screen.getByText(en['welcome.next']));
    fireEvent.click(screen.getByText(en['welcome.next']));
    fireEvent.click(screen.getByText(en['welcome.getStarted']));
    expect(patch).toHaveBeenCalledWith(welcomeFinishPatch(true));
  });

  it('lets the user turn autostart off before finishing', () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({ updateSettings: patch });
    renderWizard();
    fireEvent.click(screen.getByText(en['welcome.next']));
    fireEvent.click(screen.getByText(en['welcome.next']));
    fireEvent.click(screen.getByText(en['welcome.step3.autostart']));
    fireEvent.click(screen.getByText(en['welcome.getStarted']));
    expect(patch).toHaveBeenCalledWith(welcomeFinishPatch(false));
  });

  it('skips straight to finishing from any step', () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState({ updateSettings: patch });
    renderWizard();
    fireEvent.click(screen.getByText(en['welcome.skip']));
    expect(patch).toHaveBeenCalledWith(welcomeFinishPatch(true));
  });
});
