# Extension Usage Guide

## ⚠️ IMPORTANT: Event Sending Policy

The extension will **ONLY send proctoring events to the server when an assessment is ACTIVE**.

### What Makes an Assessment Active?

An assessment is considered active when ALL THREE fields are set:
1. `assessmentId` - Valid UUID
2. `candidateId` - Valid UUID  
3. `submissionId` - Valid UUID

### Configuration Example

```javascript
// ✅ CORRECT: This WILL start monitoring and send events
window.postMessage({
  target: "proctor-ext",
  type: "SET_CONFIG",
  payload: {
    baseUrl: "http://localhost:3000",
    assessmentId: "550e8400-e29b-41d4-a716-446655440000",
    candidateId: "660e8400-e29b-41d4-a716-446655440000",
    submissionId: "770e8400-e29b-41d4-a716-446655440000"
  }
}, "*");

// ❌ WRONG: Missing submissionId - NO events will be sent
window.postMessage({
  target: "proctor-ext",
  type: "SET_CONFIG",
  payload: {
    baseUrl: "http://localhost:3000",
    assessmentId: "550e8400-e29b-41d4-a716-446655440000",
    candidateId: "660e8400-e29b-41d4-a716-446655440000"
  }
}, "*");
```

## API Endpoint

All events are sent to: `POST /api/proctor/event`

**Payload Structure:**
```json
{
  "submissionId": "770e8400-e29b-41d4-a716-446655440000",
  "assessmentId": "550e8400-e29b-41d4-a716-446655440000",
  "candidateId": "660e8400-e29b-41d4-a716-446655440000",
  "type": "FACE_ABSENT",
  "detail": { "reason": "...", "_src": "ext" },
  "source": "CLIENT",
  "timestamp": 1703198400000
}
```

## Stopping the Extension

To stop monitoring (e.g., when assessment ends):

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

This will:
- Set `isActive` to `false`
- Stop the heartbeat loop
- Prevent any further events from being sent

## Monitoring Behavior

### While Active (isActive = true):
- Heartbeat every 10 seconds
- Tracks window focus changes
- Detects tab switches
- Monitors fullscreen state
- Checks for multi-display usage

### While Inactive (isActive = false):
- **No events sent to server**
- **No background loops running**
- Waiting for valid configuration

## Testing

1. Load extension in Chrome
2. Open DevTools Console
3. Send SET_CONFIG with all 3 IDs
4. Check console for: `[Extension] Assessment started, enabling monitoring`
5. Switch tabs, minimize window, etc.
6. Check your backend to verify events are being received
7. Send empty config to stop
8. Check console for: `[Extension] Assessment ended, disabling monitoring`
