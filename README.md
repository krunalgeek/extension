# Exam Proctor Helper Extension

**Version**: 1.1.0  
**Type**: Chrome Extension (Manifest V3)  
**Purpose**: Hardened proctoring monitoring for exam integrity

## Overview

This Chrome extension enhances the web-based proctoring system by monitoring browser-level events that cannot be reliably detected from JavaScript alone:

- **Tab Switches**: Detects when candidates switch between browser tabs
- **Window Focus**: Monitors when the browser window loses/gains focus
- **Fullscreen Changes**: Tracks fullscreen mode entry/exit (v1.1.0)
- **Screen Sharing**: Detects multiple screen captures and suspicious sharing
- **Navigation**: Alerts when candidates navigate away from exam URL

## Features

### Core Monitoring (v1.0.0)

1. **Tab Activation Detection**
   - Fires `KEY_SHORTCUT` event when switching tabs
   - Distinguishes between exam tabs and other tabs
   - Sends activatedTab URL to backend

2. **Window Focus Tracking**
   - Fires `VISIBILITY_HIDDEN` when window loses focus
   - Fires `FOCUS_RETURN` when focus returns
   - Detects Alt+Tab, window minimization, etc.

3. **Navigation Monitoring**
   - Fires `TAB_BLUR` when navigating away from exam URL
   - Tracks URL changes via `chrome.tabs.onUpdated`

4. **Screen Share Detection**
   - Monitors `chrome.tabCapture.getCapturedTabs()`
   - Fires `SECOND_DISPLAY_SUSPECTED` if multiple captures detected
   - Provides `chooseDesktopMedia` API for legitimate screen sharing

5. **Heartbeat Probe**
   - Every 5 seconds, checks for suspicious activity
   - Sends `AUDIO_STATS` with `ext_heartbeat: true`

### New in v1.1.0

6. **Fullscreen Change Detection**
   - Listens to `document.fullscreenchange` events
   - Fires `FULLSCREEN_CHANGE` event to backend
   - Supports Phase 1 Priority 3: Fullscreen Lock feature
   - Sends initial fullscreen state on page load

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  content.js (Content Script)                             │
│  ┌────────────────────────────────────────────┐         │
│  │ • Injected into all pages                  │         │
│  │ • window.postMessage bridge                │         │
│  │ • Fullscreen change listener               │◄────────┼─── Page Events
│  │ • Forwards to service worker               │         │
│  └────────────────────────────────────────────┘         │
│                        ▼                                 │
│  sw.js (Service Worker)                                  │
│  ┌────────────────────────────────────────────┐         │
│  │ • Tab/window listeners                     │         │
│  │ • Screen capture monitoring                │         │
│  │ • Probe loop (5s interval)                 │         │
│  │ • POST events to backend /event            │─────────┼─► Backend API
│  └────────────────────────────────────────────┘         │
│                                                           │
│  popup.html (Configuration UI)                           │
│  ┌────────────────────────────────────────────┐         │
│  │ • Set backend URL                          │         │
│  │ • Configure assessmentId/candidateId       │         │
│  │ • Save to chrome.storage.local             │         │
│  └────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Installation

### Development Mode (Local Testing)

1. **Open Chrome Extensions Page**:
   ```
   chrome://extensions
   ```

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load Extension**:
   - Click "Load unpacked"
   - Navigate to `c:\Users\skill\Development\extension`
   - Select the folder

4. **Verify Installation**:
   - Extension should appear with name "Exam Proctor Helper"
   - Version: 1.1.0
   - Status: Enabled

5. **Pin Extension** (Optional):
   - Click the puzzle icon (Extensions) in Chrome toolbar
   - Pin "Exam Proctor Helper" for easy access

### Production Deployment

1. **Package Extension**:
   ```powershell
   cd C:\Users\skill\Development\extension
   # Create ZIP of all files
   Compress-Archive -Path * -DestinationPath exam-proctor-helper-v1.1.0.zip
   ```

2. **Chrome Web Store** (Optional):
   - Create developer account
   - Upload ZIP file
   - Submit for review
   - Users install from Web Store

3. **Enterprise Deployment**:
   - Use Chrome policy: `ExtensionInstallForcelist`
   - Auto-install for all organization users

## Configuration

### Via Popup UI

1. Click the extension icon in Chrome toolbar
2. Configure settings:
   - **Backend Base URL**: `http://localhost:3000` (dev) or `https://api.yourapp.com` (prod)
   - **Assessment ID**: From your assessment system
   - **Candidate ID**: From authentication
3. Click "Save"

### Via Code (Automated)

The frontend can configure the extension programmatically:

```typescript
// In your Angular proctoring service
window.postMessage({
  target: 'proctor-ext',
  type: 'SET_CONFIG',
  payload: {
    baseUrl: environment.apiUrl,
    assessmentId: this.assessmentId,
    candidateId: this.candidateId
  }
}, '*');

// Listen for response
window.addEventListener('message', (ev) => {
  if (ev.data.target === 'proctor-page' && ev.data.type === 'SET_CONFIG_RES') {
    console.log('Extension configured:', ev.data.payload);
  }
});
```

## Integration with Frontend

### 1. Ping Check (Verify Extension Installed)

```typescript
// Check if extension is installed
window.postMessage({ target: 'proctor-ext', type: 'PING' }, '*');

window.addEventListener('message', (ev) => {
  if (ev.data.target === 'proctor-page' && ev.data.type === 'PING_RES') {
    if (ev.data.payload.ok) {
      console.log('Extension detected:', ev.data.payload.config);
      this.extensionInstalled = true;
    }
  }
});
```

### 2. Get Status

```typescript
// Get current capture/focus status
window.postMessage({ target: 'proctor-ext', type: 'GET_STATUS' }, '*');

window.addEventListener('message', (ev) => {
  if (ev.data.target === 'proctor-page' && ev.data.type === 'GET_STATUS_RES') {
    const { capturedCount, activeUrl, windowFocused } = ev.data.payload;
    console.log('Extension status:', { capturedCount, activeUrl, windowFocused });
  }
});
```

### 3. Start Screen Capture

```typescript
// Request screen share via extension
window.postMessage({ target: 'proctor-ext', type: 'START_CAPTURE' }, '*');

window.addEventListener('message', (ev) => {
  if (ev.data.target === 'proctor-page' && ev.data.type === 'START_CAPTURE_RES') {
    if (ev.data.payload.ok) {
      const streamId = ev.data.payload.streamId;
      // Use streamId with getUserMedia constraints
    }
  }
});
```

## Events Sent to Backend

The extension posts events to `${CONFIG.baseUrl}/event` endpoint:

### Event Format

```json
{
  "type": "EVENT_TYPE",
  "detail": {
    ...event-specific data,
    "_src": "ext"
  },
  "assessmentId": "abc123",
  "candidateId": "cand456"
}
```

### Event Types

| Event Type | Trigger | Detail Payload |
|------------|---------|----------------|
| `VISIBILITY_HIDDEN` | Window loses focus | `{ reason: "window_blur" }` |
| `FOCUS_RETURN` | Window gains focus | `{ reason: "window_focus" }` |
| `KEY_SHORTCUT` | Tab activated | `{ activatedTab: url, examTab: boolean, reason: "tab_activated" }` |
| `TAB_BLUR` | Navigate away | `{ url: string, reason: "navigated_away" }` |
| `SCREEN_SHARE_STARTED` | Screen capture started | `{ chooser: true }` or `{ otherCaptures: number }` |
| `SCREEN_SHARE_ERROR` | Screen capture cancelled | `{ reason: "user_cancelled" }` |
| `SCREEN_SHARE_STOPPED` | Stop request | `{ via: "ext_request" }` |
| `SECOND_DISPLAY_SUSPECTED` | Multiple captures detected | `{ reason: "multiple_tab_captures", count: number }` |
| `AUDIO_STATS` | Heartbeat (every 5s) | `{ ext_heartbeat: true }` |
| `FULLSCREEN_CHANGE` | Fullscreen toggle | `{ fullscreen: boolean, initial?: boolean }` |

## Backend Integration

### Event Endpoint

Your backend should have an endpoint to receive extension events:

```javascript
// mainBackend/api/routes/proctor/event.js
router.post('/event', async (req, res) => {
  const { type, detail, assessmentId, candidateId } = req.body;
  
  // Log to DynamoDB
  await logProctoringEvent({
    assessmentId,
    candidateId,
    eventType: type,
    eventData: detail,
    timestamp: new Date().toISOString(),
    source: detail._src || 'web'
  });
  
  // Check for violations
  if (type === 'TAB_BLUR' || type === 'VISIBILITY_HIDDEN') {
    // Increment violation count, check thresholds, etc.
  }
  
  res.json({ ok: true });
});
```

### CORS Configuration

Ensure backend allows extension origin:

```javascript
app.use(cors({
  origin: [
    'http://localhost:4200',
    'chrome-extension://*'  // Allow all extension origins
  ],
  credentials: true
}));
```

## Testing

### Manual Testing

1. **Load Extension** in Chrome
2. **Configure** via popup (or let frontend configure)
3. **Open Exam Page** (localhost:4200)
4. **Trigger Events**:
   - Switch tabs → Should log `KEY_SHORTCUT`
   - Alt+Tab to another app → Should log `VISIBILITY_HIDDEN`
   - Return to Chrome → Should log `FOCUS_RETURN`
   - Toggle fullscreen (F11) → Should log `FULLSCREEN_CHANGE`
   - Navigate to google.com → Should log `TAB_BLUR`
5. **Check Backend Logs**:
   ```bash
   docker logs mainbackend-api-1 --tail 50 | grep "event"
   ```

### Automated Testing

Create a test page:

```html
<!DOCTYPE html>
<html>
<body>
  <button onclick="testPing()">Test Ping</button>
  <button onclick="testConfig()">Test Config</button>
  <button onclick="testStatus()">Test Status</button>
  <pre id="output"></pre>

  <script>
    const output = document.getElementById('output');
    
    window.addEventListener('message', (ev) => {
      if (ev.data.target === 'proctor-page') {
        output.textContent += JSON.stringify(ev.data, null, 2) + '\n\n';
      }
    });

    function testPing() {
      window.postMessage({ target: 'proctor-ext', type: 'PING' }, '*');
    }

    function testConfig() {
      window.postMessage({
        target: 'proctor-ext',
        type: 'SET_CONFIG',
        payload: {
          baseUrl: 'http://localhost:3000',
          assessmentId: 'test-123',
          candidateId: 'cand-456'
        }
      }, '*');
    }

    function testStatus() {
      window.postMessage({ target: 'proctor-ext', type: 'GET_STATUS' }, '*');
    }
  </script>
</body>
</html>
```

### Fullscreen Testing (v1.1.0)

1. Open exam page
2. Press F11 to enter fullscreen
3. Verify backend receives:
   ```json
   {
     "type": "FULLSCREEN_CHANGE",
     "detail": { "fullscreen": true, "_src": "ext" }
   }
   ```
4. Press F11 to exit fullscreen
5. Verify backend receives:
   ```json
   {
     "type": "FULLSCREEN_CHANGE",
     "detail": { "fullscreen": false, "_src": "ext" }
   }
   ```

## Troubleshooting

### Extension Not Detected

**Symptom**: Frontend PING returns no response  
**Solutions**:
1. Verify extension is enabled in `chrome://extensions`
2. Check content script is running (open DevTools → Sources → Content Scripts)
3. Reload exam page after installing extension
4. Check console for errors

### Events Not Reaching Backend

**Symptom**: Extension is installed but no events in backend logs  
**Solutions**:
1. Open extension popup, verify configuration
2. Check backend URL is correct (http://localhost:3000)
3. Verify CORS is configured on backend
4. Check Network tab in DevTools for failed POST requests
5. Ensure `assessmentId` and `candidateId` are set

### Fullscreen Events Not Working

**Symptom**: No FULLSCREEN_CHANGE events  
**Solutions**:
1. Verify extension version is 1.1.0+
2. Reload extension in `chrome://extensions`
3. Hard refresh exam page (Ctrl+Shift+R)
4. Check console for `fullscreenchange` listener errors

### Permission Denied Errors

**Symptom**: Extension cannot access tabs or captures  
**Solutions**:
1. Verify manifest.json has required permissions
2. Check `host_permissions` includes your domain
3. Reinstall extension (remove + re-add)

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `tabs` | Access tab information (URL, activation) |
| `tabCapture` | Detect screen sharing via Chrome |
| `desktopCapture` | Provide screen share chooser |
| `storage` | Store configuration (baseUrl, IDs) |
| `scripting` | Inject content scripts |
| `activeTab` | Access current tab |
| `windows` | Monitor window focus |

## Security Considerations

1. **Content Script Injection**: Runs on `<all_urls>` to monitor all tabs
   - Only sends data to configured backend
   - No data collection outside proctoring events

2. **Message Validation**: 
   - Content script only responds to `target: "proctor-ext"`
   - Service worker validates message types

3. **Network Security**:
   - Uses HTTPS in production
   - CORS must be configured on backend
   - No sensitive data in extension storage

4. **User Consent**:
   - Extension installation requires user permission
   - Events are logged transparently
   - Users can view extension source code

## Development

### File Structure

```
extension/
├── manifest.json       # Extension metadata & permissions
├── content.js          # Content script (page bridge + fullscreen)
├── sw.js               # Service worker (event listeners)
├── popup.html          # Configuration UI
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

### Making Changes

1. **Edit files** in `c:\Users\skill\Development\extension`
2. **Reload extension**:
   - Go to `chrome://extensions`
   - Click the reload icon on "Exam Proctor Helper"
3. **Hard refresh** exam page (Ctrl+Shift+R)
4. **Test changes**

### Adding New Events

1. **Add listener** in `sw.js`:
   ```javascript
   chrome.someAPI.onEvent.addListener(async (data) => {
     postEvent('NEW_EVENT_TYPE', { detail: data });
   });
   ```

2. **Update README** with event documentation

3. **Update backend** to handle new event type

4. **Bump version** in manifest.json

## Version History

### v1.1.0 (December 21, 2024)
- ✨ Added fullscreen change detection
- ✨ Sends initial fullscreen state on page load
- 📝 Enhanced documentation
- 🔧 Updated description in manifest

### v1.0.0 (Initial Release)
- ✅ Tab switch detection
- ✅ Window focus tracking
- ✅ Navigation monitoring
- ✅ Screen share detection
- ✅ Heartbeat probe (5s interval)
- ✅ Configuration UI

## Support

For issues or questions:
1. Check this README
2. Review browser console for errors
3. Check backend logs for received events
4. Verify extension version and configuration

## License

Internal use only for proctoring system.
