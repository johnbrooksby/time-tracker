import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import Dashboard from './Dashboard'
import Tracker from './Tracker'
import { HouseholdProvider, useHousehold } from './HouseholdContext'
import HouseholdOnboarding from './HouseholdOnboarding'
import './App.css'

function AppRoutes() {
  const { household, loading } = useHousehold()

  if (loading) return <div className="centered">Loading...</div>
  if (!household) return <HouseholdOnboarding />

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/trackers/:trackerId" element={<Tracker />} />
    </Routes>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  if (loading) return <div className="centered">Loading...</div>

  return (
    <BrowserRouter>
      <div className="app">
        <header>
          <Link to="/" className="header-title-link">
            <h1>Time Tracker</h1>
          </Link>
          {session && (
            <button className="link-button" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          )}
        </header>
        {session ? (
          <HouseholdProvider>
            <AppRoutes />
          </HouseholdProvider>
        ) : (
          <Auth />
        )}
        <footer className="app-footer">
          <div className="theme-toggle">
            <span className={darkMode ? 'theme-label' : 'theme-label active'}>Light</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span className="switch-track">
                <span className="switch-thumb">
                  {darkMode ? (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                    </svg>
                  )}
                </span>
              </span>
            </label>
            <span className={darkMode ? 'theme-label active' : 'theme-label'}>Dark</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
