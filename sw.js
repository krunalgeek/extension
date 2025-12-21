// sw.js (Manifest V3, module)
let CONFIG = {
  baseUrl: "http://localhost:3000",
  assessmentId: "",
  candidateId: ""
};

// ------------- Utilities -------------
async function postEvent(type, detail = {}) {
  if (!CONFIG.assessmentId || !CONFIG.candidateId) return;
  try {
    await fetch(`${CONFIG.baseUrl}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        detail: { ...detail, _src: "ext" },
        assessmentId: CONFIG.assessmentId,
        candidateId: CONFIG.candidateId
      })
    });
  } catch (e) {
    // swallow – extension should never crash on network issues
  }
}

function isExamUrl(urlStr) {
  // Optionally restrict to your exam domain/origin; you can loosen this.
  try {
    const u = new URL(urlStr);
    // Example: only treat localhost:4200 as exam tab in dev.
    return (u.host === "localhost:4200");
  } catch { return false; }
}

// ------------- Messaging from content/page -------------
chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
  (async () => {
    switch (msg?.type) {
      case "PING":
        sendResp({ ok: true, config: CONFIG });
        break;

      case "SET_CONFIG":
        CONFIG = {
          baseUrl: msg.baseUrl || CONFIG.baseUrl,
          assessmentId: msg.assessmentId || "",
          candidateId: msg.candidateId || ""
        };
        await chrome.storage.local.set({ CONFIG });
        sendResp({ ok: true });
        break;

      case "START_CAPTURE":
        // Let user choose Screen/Window/Tab, return streamId for page (optional use).
        chrome.desktopCapture.chooseDesktopMedia(
          ["screen", "window", "tab"],
          sender.tab && sender.tab.windowId,
          (streamId) => {
            if (!streamId) {
              postEvent("SCREEN_SHARE_ERROR", { reason: "user_cancelled" });
              sendResp({ ok: false });
              return;
            }
            postEvent("SCREEN_SHARE_STARTED", { chooser: true });
            sendResp({ ok: true, streamId });
          }
        );
        // return true to keep the channel open for async sendResp
        return true;

      case "STOP_CAPTURE":
        // We can't force-stop a page's getDisplayMedia stream from here,
        // but we can flag intent or stop tabCapture (if we had started it).
        postEvent("SCREEN_SHARE_STOPPED", { via: "ext_request" });
        sendResp({ ok: true });
        break;

      case "GET_STATUS":
        {
          const capturedTabs = await chrome.tabCapture.getCapturedTabs();
          // Current active window/tab
          const win = await chrome.windows.getCurrent({ populate: true });
          const activeTab = (win.tabs || []).find(t => t.active);

          sendResp({
            ok: true,
            capturedCount: capturedTabs.length,
            activeUrl: activeTab?.url || "",
            windowFocused: win.focused
          });
        }
        break;

      default:
        sendResp({ ok: false, error: "unknown_message" });
    }
  })();
  return true;
});

// ------------- Boot: load stored config -------------
chrome.runtime.onInstalled.addListener(async () => {
  const saved = (await chrome.storage.local.get("CONFIG")).CONFIG;
  if (saved) CONFIG = saved;
});

// ------------- Focus / Tab Switch / Navigation listeners -------------
chrome.windows.onFocusChanged.addListener(async (winId) => {
  if (winId === chrome.windows.WINDOW_ID_NONE) {
    postEvent("VISIBILITY_HIDDEN", { reason: "window_blur" });
  } else {
    postEvent("FOCUS_RETURN", { reason: "window_focus" });
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return;
    const exam = isExamUrl(tab.url);
    postEvent("KEY_SHORTCUT", { activatedTab: tab.url, examTab: exam, reason: "tab_activated" });
  } catch {}
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  const navigatedAway = !isExamUrl(changeInfo.url);
  if (navigatedAway) {
    postEvent("TAB_BLUR", { url: changeInfo.url, reason: "navigated_away" });
  }
});

// ------------- Periodic "other capture?" & multi-display probe -------------
let probeTimer = null;

async function probeLoop() {
  try {
    // 1) Other captured tabs in Chrome?
    const caps = await chrome.tabCapture.getCapturedTabs();
    if ((caps?.length || 0) > 1) {
      postEvent("SECOND_DISPLAY_SUSPECTED", { reason: "multiple_tab_captures", count: caps.length });
      postEvent("SCREEN_SHARE_STARTED", { otherCaptures: caps.length });
    }

    // 2) We cannot see OS-level shares, but we can keep a heartbeat so you know the ext is alive.
    postEvent("AUDIO_STATS", { ext_heartbeat: true }); // harmless periodic ping

  } catch (e) {
    // ignore
  } finally {
    probeTimer = setTimeout(probeLoop, 5000);
  }
}

chrome.runtime.onStartup.addListener(probeLoop);
probeLoop();
