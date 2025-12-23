# Extension Usage Guide

## ⚠️ IMPORTANT: Event Sending Policy

The extension will **ONLY send proctoring events to the server when an assessment is ACTIVE**.

## 🎯 Two Assessment Modes

### 1. **Regular Mode (Default)** - Recommended for Most Assessments
Screen sharing is **OPTIONAL**. Mandatory monitoring:
- ✅ Window focus tracking
- ✅ Tab switch detection  
- ✅ Navigation away from exam
- ✅ Fullscreen changes
- ✅ Multi-monitor warnings
- ✅ Heartbeat every 10 seconds

```javascript
// Regular assessment - NO screen sharing required
window.postMessage({
  target: "proctor-ext",
  type: "SET_CONFIG",
  payload: {
    baseUrl: "http://localhost:3000",
    assessmentId: "550e8400-e29b-41d4-a716-446655440000",
    candidateId: "660e8400-e29b-41d4-a716-446655440000",
    submissionId: "770e8400-e29b-41d4-a716-446655440000",
    requireScreenShare: false  // Optional screen sharing
  }
}, "*");
```

### 2. **High-Security Mode** - For Critical Assessments
Screen sharing is **MANDATORY**. Extension will alert if screen share stops.

```javascript
// High-security assessment - Screen sharing REQUIRED
window.postMessage({
  target: "proctor-ext",
  type: "SET_CONFIG",
  payload: {
    baseUrl: "http://localhost:3000",
    assessmentId: "550e8400-e29b-41d4-a716-446655440000",
    candidateId: "660e8400-e29b-41d4-a716-446655440000",
    submissionId: "770e8400-e29b-41d4-a716-446655440000",
    requireScreenShare: true  // ← Mandatory screen sharing
  }
}, "*");
```

## 📊 Event Severity Levels

Events are now tagged with severity for better flagging:

- **CRITICAL** - `TAB_BLUR` (navigated away), `SCREEN_SHARE_REQUIRED_NOT_ACTIVE`
- **HIGH** - `VISIBILITY_HIDDEN` (window blur), `KEY_SHORTCUT` to non-exam tab, `SECOND_DISPLAY_SUSPECTED`
- **LOW** - `FOCUS_RETURN`, `HEARTBEAT`, tab switch to exam tab

## 🚀 Starting Screen Share (Optional)

```javascript
// Ask candidate to share screen (they can decline if requireScreenShare=false)
window.postMessage({
  target: "proctor-ext",
  type: "START_CAPTURE"
}, "*");

// Listen for response
window.addEventListener("message", (ev) => {
  if (ev.data?.target === "proctor-page" && ev.data?.type === "START_CAPTURE_RES") {
    if (ev.data.payload.ok) {
      console.log("Screen sharing started:", ev.data.payload.streamId);
    } else {
      console.log("Screen sharing failed:", ev.data.payload.error);
      // If requireScreenShare=true, you should block assessment
    }
  }
});
```

## 📡 New Event Types

### `SCREEN_SHARE_REQUIRED_NOT_ACTIVE`
Sent every 10 seconds if high-security mode enabled but screen share not active.

```json
{
  "type": "SCREEN_SHARE_REQUIRED_NOT_ACTIVE",
  "severity": "critical",
  "detail": {
    "reason": "mandatory_screen_share_missing"
  }
}
```

## 🔍 Check Assessment Status

```javascript
window.postMessage({
  target: "proctor-ext",
  type: "GET_STATUS"
}, "*");

// Response includes:
// - isActive: true/false
// - screenShareActive: true/false
// - requireScreenShare: true/false
// - windowFocused: true/false
```

## 🛑 Stopping the Extension

```javascript
window.postMessage({
  target: "proctor-ext",
  type: "SET_CONFIG",
  payload: {
    assessmentId: "",
    candidateId: "",
    submissionId: ""
  }
}, "*");
```

## 💡 Best Practices

1. **Regular Assessments**: Set `requireScreenShare: false`
   - Less invasive, better candidate experience
   - Still catches 80% of cheating attempts
   - Combine with webcam monitoring for best results

2. **High-Stakes Assessments**: Set `requireScreenShare: true`
   - Executive positions, senior roles
   - Technical assessments with code challenges
   - When company policy requires full monitoring

3. **Backend Integration**: Use `severity` field to auto-flag candidates
   - 3+ CRITICAL events = auto-reject
   - 5+ HIGH events = manual review required
   - Track patterns (e.g., multiple tab switches in 30 seconds)
