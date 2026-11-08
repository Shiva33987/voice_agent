const fs = require('fs');
const vm = require('vm');

console.log("=== Patching WebRTC Audio Playback in Workflow Page Chunk ===");

const chunkPath = '/app/.next/static/chunks/app/workflow/[workflowId]/page-2e2ef4f23156c1bd.js';
if (fs.existsSync(chunkPath)) {
  let content = fs.readFileSync(chunkPath, 'utf8');

  // 1. Fix track assignment and add explicit .play()
  const oldTrackCode = '"audio"===e.track.kind&&z.current&&(z.current.srcObject=e.streams[0])';
  const newTrackCode = '"audio"===e.track.kind&&z.current&&(z.current.srcObject=(e.streams&&e.streams[0])?e.streams[0]:new MediaStream([e.track]),z.current.play().catch(e=>console.warn("[WebRTC] audio play blocked:",e)))';

  if (content.includes(oldTrackCode)) {
    content = content.replace(oldTrackCode, newTrackCode);
    console.log('[SUCCESS] Replaced track assignment with fallback stream and .play() call!');
  }

  // 2. Remove className:"hidden" from <audio> (which causes Chrome to mute/suspend playback)
  // Replace with off-screen fixed style
  const oldAudioTag = '(0,r.jsx)("audio",{ref:u,autoPlay:!0,playsInline:!0,className:"hidden"})';
  const newAudioTag = '(0,r.jsx)("audio",{ref:u,autoPlay:!0,playsInline:!0,style:{position:"fixed",bottom:0,opacity:0,pointerEvents:"none"}})';

  if (content.includes(oldAudioTag)) {
    content = content.replace(oldAudioTag, newAudioTag);
    console.log('[SUCCESS] Replaced <audio className="hidden"> with visible off-screen style!');
  }

  // Also unlock audio when clicking start call
  const startCallTarget = 'T.current=!0,k()';
  const startCallReplacement = 'T.current=!0,u.current&&u.current.play().catch(()=>{}),k()';
  if (content.includes(startCallTarget)) {
    content = content.replace(startCallTarget, startCallReplacement);
    console.log('[SUCCESS] Added audio pre-unlock on call start!');
  }

  try {
    new vm.Script(content);
    fs.writeFileSync(chunkPath, content, 'utf8');
    console.log('[SUCCESS] Chunk validated with 100% valid JS syntax and saved!');
  } catch (e) {
    console.error('[ERROR] Syntax error when validating chunk:', e.message);
  }
} else {
  console.error('[ERROR] File not found:', chunkPath);
}
