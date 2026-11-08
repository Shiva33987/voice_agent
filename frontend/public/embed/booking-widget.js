(function() {
  "use strict";

  // Prevent double loading
  if (window.__DOGRAH_BOOKING_WIDGET_INITIALIZED__) return;
  window.__DOGRAH_BOOKING_WIDGET_INITIALIZED__ = true;

  // Find the invoking script tag
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var agentId = currentScript ? currentScript.getAttribute('data-agent-id') : '1';
  var primaryColor = currentScript ? (currentScript.getAttribute('data-primary-color') || '#2563eb') : '#2563eb';
  var buttonText = currentScript ? (currentScript.getAttribute('data-label') || 'Book with AI Agent') : 'Book with AI Agent';
  var position = currentScript ? (currentScript.getAttribute('data-position') || 'bottom-right') : 'bottom-right';

  // Derive Dograh baseUrl from script src
  var scriptUrl = currentScript && currentScript.src ? currentScript.src : window.location.origin;
  var urlObj = new URL(scriptUrl);
  var baseUrl = urlObj.origin;
  var bookingUrl = baseUrl + '/book/' + (agentId || '1') + '?embed=true';

  // Create Container
  var container = document.createElement('div');
  container.id = 'dograh-booking-widget-container';
  container.style.position = 'fixed';
  container.style.zIndex = '999999';
  container.style[position.includes('left') ? 'left' : 'right'] = '24px';
  container.style[position.includes('top') ? 'top' : 'bottom'] = '24px';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Trigger Button
  var triggerBtn = document.createElement('button');
  triggerBtn.id = 'dograh-booking-trigger-btn';
  triggerBtn.innerHTML = `
    <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; background:rgba(255,255,255,0.2); border-radius:50%; margin-right:8px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    </span>
    <span>${buttonText}</span>
  `;

  triggerBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    background: ${primaryColor};
    color: #ffffff;
    border: none;
    border-radius: 9999px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
  `;

  triggerBtn.onmouseover = function() {
    triggerBtn.style.transform = 'translateY(-2px) scale(1.02)';
    triggerBtn.style.boxShadow = '0 15px 30px -5px rgba(37, 99, 235, 0.4)';
  };
  triggerBtn.onmouseout = function() {
    triggerBtn.style.transform = 'translateY(0) scale(1)';
    triggerBtn.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
  };

  // Modal Overlay
  var overlay = document.createElement('div');
  overlay.id = 'dograh-booking-modal-overlay';
  overlay.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000000;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    opacity: 0;
    transition: opacity 0.2s ease-out;
  `;

  // Modal Window
  var modal = document.createElement('div');
  modal.style.cssText = `
    position: relative;
    width: 100%;
    max-width: 840px;
    height: 90vh;
    max-height: 720px;
    background: #090d16;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
  `;

  // Close Button
  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 14px;
    right: 16px;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  `;
  closeBtn.onmouseover = function() { closeBtn.style.background = 'rgba(239, 68, 68, 0.8)'; closeBtn.style.color = '#fff'; };
  closeBtn.onmouseout = function() { closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'; closeBtn.style.color = '#cbd5e1'; };

  // Iframe to Agent Booking Page
  var iframe = document.createElement('iframe');
  iframe.src = bookingUrl;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  `;

  modal.appendChild(closeBtn);
  modal.appendChild(iframe);
  overlay.appendChild(modal);

  function openModal() {
    overlay.style.display = 'flex';
    setTimeout(function() {
      overlay.style.opacity = '1';
    }, 10);
  }

  function closeModal() {
    overlay.style.opacity = '0';
    setTimeout(function() {
      overlay.style.display = 'none';
    }, 200);
  }

  triggerBtn.onclick = openModal;
  closeBtn.onclick = closeModal;
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      closeModal();
    }
  };

  container.appendChild(triggerBtn);
  document.body.appendChild(container);
  document.body.appendChild(overlay);

})();

