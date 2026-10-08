import React, { useEffect, useRef } from 'react';
import MegaMenu from '@undrr/undrr-mangrove/components/MegaMenu.js';

const sections = [
  { title: 'Upload a PDF', bannerButton: { url: '#upload' },
    bannerHeading: 'Check your PDFs', bannerDescription: 'Check document information, text, structure and image descriptions. Your PDFs stay on your device.',
    items: [{ title: 'Upload a PDF', url: '#upload' }, { title: 'Check several PDFs', url: '#batch' }, { title: 'Try a sample', url: '#sample' }] },
  { title: 'Try a sample', bannerButton: { url: '#sample' } },
  { title: 'Settings', bannerButton: { url: '#settings' } },
  { title: 'About', bannerHeading: 'Keep your findings clear',
    bannerDescription: 'Help people and their tools understand your PDFs. Review possible problems in descriptions, reading order and saved details. A clear result does not guarantee accessibility or accurate AI answers.',
    items: [{ title: 'PDFs for people and their tools', url: '#about' }, { title: 'What this tool checks', url: '#capabilities' }, { title: 'AI and privacy', url: '#privacy' }] },
];
/** Published menu owns disclosure/focus behavior; hash actions stay in the local app. */
export function SiteNavigation({ onNavigate }) {
  const wrapper = useRef(null), frame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const activate = event => {
    const link = event.target.closest('a');
    const action = link?.getAttribute('href')?.slice(1);
    if (!['upload', 'sample', 'batch', 'settings', 'about', 'capabilities', 'privacy'].includes(action)) return;
    event.preventDefault();
    const sidebar = link.closest('.mg-mega-mobile-sidebar');
    sidebar?.querySelector('.mg-mega-mobile-sidebar__close')?.click();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const opener = sidebar ? wrapper.current?.querySelector('.mg-mega-topbar-mobile__icon-button') : link;
      onNavigate(action, opener);
    });
  };
  return <div className="site-navigation" ref={wrapper} onClickCapture={activate}>
    <MegaMenu sections={sections} logoSrc={new URL('./images/pdf-signal-check-wordmark.svg', document.baseURI).href}
      logoAlt="PDF Signal Check — Help people and their tools understand your PDFs" logoHref="#upload" logoWidth={280} logoHeight={76}
      labels={{ navLabel: 'PDF Signal Check navigation' }} />
  </div>;
}
