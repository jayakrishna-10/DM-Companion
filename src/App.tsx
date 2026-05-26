import { HashRouter, Routes, Route } from 'react-router'
import { DatabaseProvider } from '@/hooks/useDatabase'
import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { NewEntry } from '@/pages/NewEntry'
import { MultiInput } from '@/pages/MultiInput'
import { History } from '@/pages/History'
import { Issues } from '@/pages/Issues'
import { Equipment } from '@/pages/Equipment'
import { Settings } from '@/pages/Settings'
import { Logs } from '@/pages/Logs'
import { Toaster } from '@/components/ui/Toaster'

export default function App() {
  return (
    <DatabaseProvider>
      <HashRouter>
        <div className="noise-overlay" />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewEntry />} />
            <Route path="/multi" element={<MultiInput />} />
            <Route path="/history" element={<History />} />
            <Route path="/issues" element={<Issues />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster />
      </HashRouter>
    </DatabaseProvider>
  )
}
