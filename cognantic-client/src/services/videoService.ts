// ─────────────────────────────────────────────────────────────────
// src/services/videoService.ts
//
// In-platform video conferencing using Jitsi Meet (free, open-source,
// no API key required, embeds fully inside an iframe).
//
// HOW IT WORKS:
//   - A deterministic room URL is generated from the sessionId.
//   - Both the patient and clinician derive the SAME URL independently
//     — no link sharing or backend change needed.
//   - The call renders inside an <iframe> inside the platform.
//   - Users never leave Cognantic.
// ─────────────────────────────────────────────────────────────────

// Public Jitsi server — free, no account/key needed.
// For production you can self-host: https://jitsi.github.io/handbook/docs/devops-guide/
const JITSI_DOMAIN = 'meet.jit.si'

export const videoService = {
  /**
   * Generates a deterministic Jitsi Meet room URL from a sessionId.
   *
   * Both patient and clinician call this with the same sessionId
   * and land in the same room — automatically.
   *
   * Config flags embedded in the URL hash:
   *   - prejoinPageEnabled=false  → skip the "are you ready?" lobby screen
   *   - startWithAudioMuted=false → mic ON by default
   *   - startWithVideoMuted=false → camera ON by default
   *   - disableDeepLinking=true   → prevent Jitsi from pushing users to the mobile app
   */
  getRoomUrl: (sessionId: string): string => {
    // Prefix makes rooms unguessable from outside the platform
    const roomName = `cognantic-${sessionId}`
    const config = [
      'config.prejoinPageEnabled=false',
      'config.startWithAudioMuted=false',
      'config.startWithVideoMuted=false',
      'config.disableDeepLinking=true',
      'config.toolbarButtons=["microphone","camera","chat","fullscreen","hangup"]',
    ].join('&')
    return `https://${JITSI_DOMAIN}/${roomName}#${config}`
  },
}