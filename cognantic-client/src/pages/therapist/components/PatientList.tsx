// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/components/PatientList.tsx
// Assigned-patient list / pending requests tab.
// Extracted verbatim from TherapistPage – no logic changed.
// ─────────────────────────────────────────────────────────────────

import React from 'react'

const PatientList: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--n-400)' }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>📨</div>
    <p style={{ fontSize: 14 }}>
      Pending session requests will appear here.<br />
      <code style={{ fontSize: 11, background: 'var(--n-100)', padding: '2px 6px', borderRadius: 4, marginTop: 8, display: 'inline-block' }}>
        GET /api/v1/Clinicians/&#123;id&#125;/requests
      </code>
    </p>
  </div>
)

export default PatientList
