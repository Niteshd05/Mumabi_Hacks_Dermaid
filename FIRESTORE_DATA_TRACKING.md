# Firestore Data Tracking Summary

This document outlines all user data and logs being tracked in Firebase Firestore.

## Data Structure

### 1. User Profiles (`users/{userId}`)
**Collection**: `users`  
**Document ID**: User's Firebase Auth UID

**Fields Tracked**:
- `id`: User's Firebase Auth UID
- `name`: User's display name (from Google Sign-In)
- `email`: User's email address
- `photoURL`: User's profile photo URL
- `fitzpatrickScale`: Skin tone scale (1-6)
- `skinType`: Skin type (e.g., "oily", "dry", "combination")
- `concerns`: Array of skin concerns (e.g., ["acne", "hyperpigmentation"])
- `consent`: User consent object with:
  - `termsAccepted`: Boolean
  - `termsAcceptedAt`: Timestamp
  - `privacyAccepted`: Boolean
  - `privacyAcceptedAt`: Timestamp
- `createdAt`: Account creation timestamp
- `updatedAt`: Last profile update timestamp

**When Saved**:
- On onboarding completion
- When user updates profile information
- When user edits skin tone, type, or concerns

---

### 2. Scan Results (`users/{userId}/scans/{scanId}`)
**Collection**: `users/{userId}/scans`  
**Document ID**: Auto-generated

**Fields Tracked**:
- `agentType`: Type of scan - `'cosmetic'` or `'medical'`
- `result`: Scan result object:
  - **For Cosmetic Scans**:
    - `detected_conditions`: Array of conditions (e.g., ["acne_vulgaris", "dark_circles"])
    - `severity_score`: Number (0-1)
    - `confidence`: Number (0-1)
  - **For Medical Scans**:
    - `condition_match`: Medical condition (e.g., "eczema", "psoriasis", "normal")
    - `risk_flag`: Risk level - `'low'`, `'medium'`, or `'high'`
    - `visual_markers`: Array of visual markers
- `imageUrl`: Base64 encoded image or image URL
- `timestamp`: When the scan was performed
- `createdAt`: Firestore server timestamp

**When Saved**:
- After every scan (cosmetic or medical)
- Both camera capture and image upload

**Use Cases**:
- Scan history tracking
- Progress monitoring over time
- Analytics and insights

---

### 3. Agent Messages (`users/{userId}/agent_messages/{messageId}`)
**Collection**: `users/{userId}/agent_messages`  
**Document ID**: Auto-generated

**Fields Tracked**:
- `id`: Unique message ID (e.g., "cosmetic-1234567890")
- `agentType`: Agent type - `'cosmetic'`, `'medical'`, or `'neutral'`
- `tone`: Message tone - `'friendly'` or `'clinical'`
- `message`: The agent's message text
- `highlights`: Optional array of highlight strings
- `alerts`: Optional array of environmental alerts
- `actions`: Optional array of action buttons
- `routineDiff`: Optional routine changes object
- `meta`: Metadata object:
  - `severity`: `'info'`, `'warning'`, or `'danger'`
  - `confidence`: Confidence score (0-1)
  - `timestamp`: When message was created
  - `triggeredBy`: What triggered the message (`'scan'`, `'environment'`, `'onboarding'`)
- `read`: Boolean - whether user has read the message
- `timestamp`: Firestore server timestamp

**When Saved**:
- After scan completion (cosmetic or medical)
- On environmental changes (UV, humidity)
- On onboarding completion
- When user manually triggers agent interaction

**When Loaded**:
- On app initialization (if user is logged in)
- Up to 20 most recent messages
- Sorted chronologically (oldest first)

**When Deleted**:
- When user clicks "Clear Messages" in agent drawer
- All messages are deleted from Firestore

---

## Data Flow

### On App Load:
1. User authenticates (Google Sign-In)
2. User profile loaded from `users/{userId}`
3. Agent messages loaded from `users/{userId}/agent_messages` (last 20)
4. Scan history can be loaded from `users/{userId}/scans` (not currently displayed in UI)

### On Scan:
1. User captures/uploads image
2. Image sent to API (cosmetic or medical endpoint)
3. Result processed and mapped
4. Scan result saved to `users/{userId}/scans`
5. Agent message generated from scan result
6. Agent message saved to `users/{userId}/agent_messages`
7. Message displayed in agent drawer

### On Profile Update:
1. User edits profile information
2. Changes saved to `users/{userId}`
3. `updatedAt` timestamp updated

---

## Privacy & Security

- All data is scoped to user's UID (users can only access their own data)
- User consent is tracked for Terms & Conditions
- Images are stored as base64 (consider migrating to Firebase Storage for better performance)
- No sensitive medical data is stored (only scan results and recommendations)

---

## Future Enhancements

### Potential Additional Tracking:
- **Routine Usage**: Track which products/routines users actually use
- **Progress Photos**: Store before/after comparison images
- **Reminders**: Track when users set reminders and if they follow through
- **Feedback**: User feedback on recommendations
- **Analytics Events**: Track user interactions for product improvement
- **Device Info**: Track device type, OS version for debugging
- **App Version**: Track app version for compatibility

### Potential Optimizations:
- Pagination for scan history (currently unlimited)
- Image compression before storage
- Migration to Firebase Storage for images
- Real-time sync for agent messages
- Offline support with local caching

---

## Current Limitations

1. **Scan History**: `getUserScans()` function exists but returns empty array (not implemented)
2. **Message Limit**: Only last 20 messages are loaded (older messages not accessible)
3. **Image Storage**: Images stored as base64 strings (not optimized)
4. **No Pagination**: All data loaded at once (could be slow for heavy users)

---

## Database Structure Visualization

```
users/
  └── {userId}/
      ├── (profile data)
      ├── scans/
      │   ├── {scanId1}/
      │   │   ├── agentType: "cosmetic"
      │   │   ├── result: {...}
      │   │   ├── imageUrl: "..."
      │   │   └── timestamp: ...
      │   ├── {scanId2}/
      │   └── ...
      └── agent_messages/
          ├── {messageId1}/
          │   ├── id: "cosmetic-123"
          │   ├── message: "..."
          │   ├── timestamp: ...
          │   └── read: false
          ├── {messageId2}/
          └── ...
```

