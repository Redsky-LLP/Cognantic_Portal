// ─────────────────────────────────────────────────────────────────
// src/pages/patient/PatientPage.tsx
// Root – only handles screen-level routing between Dashboard & Finder.
// All UI has been moved to sub-components under ./components/
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import DashboardView from './components/DashboardView'
import FinderFlow    from './components/FinderFlow'

type Screen = 'dashboard' | 'finder'

const PatientPage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('dashboard')

  return screen === 'finder'
    ? <FinderFlow    onBack={() => setScreen('dashboard')} />
    : <DashboardView onFindNew={() => setScreen('finder')} />
}

export default PatientPage
