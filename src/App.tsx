import { BrowserRouter, Routes, Route } from 'react-router'
import { DatabaseProvider } from '@/hooks/useDatabase'
import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { NewEntry } from '@/pages/NewEntry'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { Toaster } from '@/components/ui/Toaster'

export default function App() {
  return (
    <DatabaseProvider>
      <BrowserRouter>
        <div className="noise-overlay" />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewEntry />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </DatabaseProvider>
  )
}