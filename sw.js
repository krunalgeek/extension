// sw.js (Manifest V3, module)
let CONFIG = {
  baseUrl: "http://localhost:3000",
  assessmentId: "",
  candidateId: "",
  submissionId: "",
  isActive: false
};

// ------------- Utilities -------------
async function postEvent(type, detail = {}) {
  // Only send events when assessment is active
  if (!CONFIG.isActive || !CONFIG.assessmentId || !CONFIG.candidateId || !CONFIG.submissionId) return;
  
  try {
    await fetch(`${CONFIG.baseUrl}/api/proctor/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: CONFIG.submissionId,
        assessmentId: CONFIG.assessmentId,
        candidateId: CONFIG.candidateId,
        type,
        detail: { ...detail, _src: "ext" },
        source: "CLIENT",
        timestamp: Date.now()
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
          candidateId: msg.candidateId || "",
          submissionId: msg.submissionId || "",
          isActive: !!(msg.assessmentId && msg.candidateId && msg.submissionId)
        };
        await chrome.storage.local.set({ CONFIG });
        
        // Start or stop monitoring based on isActive
        if (CONFIG.isActive && !probeTimer) {
          console.log('[Extension] Assessment started, enabling monitoring');
          probeLoop();
        } else if (!CONFIG.isActive && probeTimer) {
          console.log('[Extension] Assessment ended, disabling monitoring');
          clearTimeout(probeTimer);
          probeTimer = null;
        }
        
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
            isActive: CONFIG.isActive,
            screenShareActive: CONFIG.screenShareActive,
            requireScreenShare: CONFIG.requireScreenShare,
            capturedCount: capturedTabs.length,
            activeUrl: activeTab?.url || "",
            windowFocused: win.focused
          });
        }
        break;

      case "FULLSCREEN_CHANGE":
        postEvent("FULLSCREEN_CHANGE", { 
          fullscreen: msg.fullscreen, 
          initial: msg.initial || false 
        });
        sendResp({ ok: true });
        break;

      default:
        sendResp({ ok: false, error: "unknown_message" });
    }
  })();
  return true;
});

// MANDATORY: Always track window focus (core proctoring feature)
// ------------- Boot: load stored config -------------
chrome.runtime.onInstalled.addListener(async () => {
  const saved = (await chrome.storage.local.get("CONFIG")).CONFIG;
  if (saved) CONFIG = saved;
});

// ------------- Focus / Tab Switch / Navigation listeners -------------
// MANDATORY: Always track window focus (core proctoring feature)
chrome.windows.onFocusChanged.addListener(async (winId) => {
  if (winId === chrome.windows.WINDOW_ID_NONE) {
    postEvent("VISIBILITY_HIDDEN", { reason: "window_blur", severity: "high" });
  } else {
    postEvent("FOCUS_RETURN", { reason: "window_focus" });
  }
});

// MANDATORY: Track tab switches (critical for detecting cheating)
chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  try {
    const taam = isExamUrl(tab.url);
    postEvent("KEY_SHORTCUT", { 
      activatedTab: tab.url, 
      examTab: exam, 
      reason: "tab_activated",
      severity: exam ? "low" : "high"
    });
  } catch {}
});

// MANDATORY: Track navigation away from exam (critical violation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;
  const navigatedAway = !isExamUrl(changeInfo.url);
  if (navigatedAway) {
    postEvent("TAB_BLUR", { 
      url: changeInfo.url, 
      reason: "navigated_away",
      severity: "critical"
    });
  }
});

// ------------- Periodic "other capture?" & multi-display probe -------------
let probeTimer = null;

async function probeLoop() {
  // Only run when assessment is active
  if (!CONFIG.isActive) {
    probeTimer = null;
    return;
  }
  
  try {
    // 1) Check for multiple screen captures (multi-monitor detection)
    const caps = await chrome.tabCapture.getCapturedTabs();
    if ((caps?.length || 0) > 1) {
      postEvent("SECOND_DISPLAY_SUSPECTED", { 
        reason: "multiple_tab_captures", 
        count: caps.length,
        severity: "high"
      });
    }

    // 2) Heartbeat - prove extension is alive and candidate is still present
    const win = await chrome.windows.getCurrent({ populate: true });
    if (win.focused) {
      postEvent("HEARTBEAT", { 
        timestamp: Date.now()
      });
    }
  } catch (e) {
    // ignore
  } finally {
    // Only continue loop if assessment is still active
    if (CONFIG.isActive) {
      probeTimer = setTimeout(probeLoop, 10000); // Every 10 seconds
    } else {
      probeTimer = null;
    }
  }
}

// Don't auto-start probe loop on startup - wait for SET_CONFIG with active assessment
