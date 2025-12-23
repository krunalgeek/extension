// Bridge page <-> extension
// Exposes a small API via window.postMessage and listens for replies.

(function () {
  const EXT_MSG = (type, payload = {}) =>
    new Promise((resolve) => chrome.runtime.sendMessage({ type, ...payload }, resolve));

  // Listen to page requests
  window.addEventListener("message", async (ev) => {
    if (!ev.data || ev.source !== window) return;
    const { target, type, payload } = ev.data;
    if (target !== "proctor-ext") return;

    if (type === "PING") {
      const res = await EXT_MSG("PING");
      window.postMessage({ target: "proctor-page", type: "PING_RES", payload: res }, "*");
    }

    if (type === "SET_CONFIG") {
      const res = await EXT_MSG("SET_CONFIG", payload);
      window.postMessage({ target: "proctor-page", type: "SET_CONFIG_RES", payload: res }, "*");
    }

    if (type === "START_CAPTURE") {
      const res = await EXT_MSG("START_CAPTURE");
      window.postMessage({ target: "proctor-page", type: "START_CAPTURE_RES", payload: res }, "*");
    }

    if (type === "STOP_CAPTURE") {
      const res = await EXT_MSG("STOP_CAPTURE");
      window.postMessage({ target: "proctor-page", type: "STOP_CAPTURE_RES", payload: res }, "*");
    }

    if (type === "GET_STATUS") {
      const res = await EXT_MSG("GET_STATUS");
      window.postMessage({ target: "proctor-page", type: "GET_STATUS_RES", payload: res }, "*");
    }
  }, false);

  // Monitor fullscreen changes
  let isFullscreen = !!document.fullscreenElement;
  
  document.addEventListener('fullscreenchange', async () => {
    const nowFullscreen = !!document.fullscreenElement;
    if (nowFullscreen !== isFullscreen) {
      isFullscreen = nowFullscreen;
      await EXT_MSG('FULLSCREEN_CHANGE', { fullscreen: isFullscreen });
    }
  });

  // Send initial fullscreen state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      EXT_MSG('FULLSCREEN_CHANGE', { fullscreen: isFullscreen, initial: true });
    });
  } else {
    EXT_MSG('FULLSCREEN_CHANGE', { fullscreen: isFullscreen, initial: true });
  }
})();

