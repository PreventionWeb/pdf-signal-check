import React from 'react';
import { StoryPlayer } from './StoryPlayer.jsx';
import snapshot from './snapshot.json';
import './story.css';

/** Loaded only on About. Unmounting disposes the player's media and animations. */
export default function AboutStory({ onCheck }) {
  const readGuidance = () => {
    const heading = document.getElementById('about-why');
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading?.focus({ preventScroll: true });
  };
  return <>
    <StoryPlayer data={snapshot} onCheck={onCheck} onAbout={readGuidance} />
    <p className="story-footnote">A synthetic example: the report, data and people are fictional. Narration, music and figure illustrations are AI-generated. <a href="#about" onClick={event => { event.preventDefault(); readGuidance(); }}>Read the guidance behind it</a>.</p>
  </>;
}
