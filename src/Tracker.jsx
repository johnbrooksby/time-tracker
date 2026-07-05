import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useHousehold } from './HouseholdContext'

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

function Tracker() {
  const { trackerId } = useParams()
  const { household } = useHousehold()

  const [tracker, setTracker] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [notes, setNotes] = useState('')
  const [night, setNight] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    fetchTracker()
    fetchSessions()

    const channel = supabase
      .channel(`driving_sessions_changes_${trackerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driving_sessions', filter: `tracker_id=eq.${trackerId}` },
        () => fetchSessions()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [trackerId])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [running, startedAt])

  async function fetchTracker() {
    const { data } = await supabase.from('trackers').select('*').eq('id', trackerId).single()
    setTracker(data)
  }

  async function fetchSessions() {
    const { data, error } = await supabase
      .from('driving_sessions')
      .select('*')
      .eq('tracker_id', trackerId)
      .order('started_at', { ascending: false })

    if (!error) setSessions(data)
    setLoading(false)
  }

  const totalMinutes = useMemo(
    () => sessions.reduce((sum, s) => sum + s.minutes, 0),
    [sessions]
  )
  const nightMinutes = useMemo(
    () => sessions.filter((s) => s.night).reduce((sum, s) => sum + s.minutes, 0),
    [sessions]
  )
  const goalHours = tracker?.goal_hours ?? 60
  const nightGoalHours = tracker?.night_goal_hours ?? 10
  const progressPct = Math.min(100, (totalMinutes / (goalHours * 60)) * 100)
  const nightProgressPct = Math.min(100, (nightMinutes / (nightGoalHours * 60)) * 100)
  const isHouseholdHead = household && userId && household.created_by === userId

  function startEditingGoal() {
    setGoalInput(String(goalHours))
    setEditingGoal(true)
  }

  async function handleGoalSubmit(e) {
    e.preventDefault()
    const hours = parseInt(goalInput, 10)
    if (!hours || hours <= 0) return

    await supabase.from('trackers').update({ goal_hours: hours }).eq('id', trackerId)
    setEditingGoal(false)
    fetchTracker()
  }

  function startTimer() {
    setStartedAt(Date.now())
    setElapsedSec(0)
    setRunning(true)
  }

  async function stopTimer() {
    setRunning(false)
    const endedAt = Date.now()
    const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60000))
    await saveSession(new Date(startedAt), new Date(endedAt), minutes)
  }

  async function saveSession(start, end, minutes) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('driving_sessions').insert({
      tracker_id: trackerId,
      user_id: user.id,
      started_at: start.toISOString(),
      ended_at: end.toISOString(),
      minutes,
      notes: notes || null,
      night,
    })

    setNotes('')
    setNight(false)
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    const hours = parseInt(manualHours, 10) || 0
    const minutes = (parseInt(manualMinutes, 10) || 0) + hours * 60
    if (minutes <= 0) return

    const date = manualDate ? new Date(manualDate) : new Date()
    const end = date
    const start = new Date(end.getTime() - minutes * 60000)

    await saveSession(start, end, minutes)
    setManualHours('')
    setManualMinutes('')
    setManualDate('')
  }

  async function deleteSession(id) {
    await supabase.from('driving_sessions').delete().eq('id', id)
    fetchSessions()
  }

  return (
    <div className="tracker">
      <Link to="/" className="back-link">
        &larr; All trackers
      </Link>
      <h2 className="tracker-name">{tracker?.name ?? '...'}</h2>

      <section className="progress-section">
        {editingGoal ? (
          <form className="goal-edit-form" onSubmit={handleGoalSubmit}>
            <span>Goal:</span>
            <input
              type="number"
              min="1"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              autoFocus
              required
            />
            <span>hours</span>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditingGoal(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="progress-numbers">
            <strong>{formatMinutes(totalMinutes)}</strong> of {goalHours}h goal
            {isHouseholdHead && (
              <button className="link-button" onClick={startEditingGoal}>
                Edit
              </button>
            )}
          </div>
        )}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </section>

      <section className="progress-section">
        <div className="progress-numbers">
          <strong>{formatMinutes(nightMinutes)}</strong> of {nightGoalHours}h night driving
        </div>
        <div className="progress-bar">
          <div className="progress-fill night-fill" style={{ width: `${nightProgressPct}%` }} />
        </div>
      </section>

      <section className="timer-section">
        {!running ? (
          <button className="primary-button" onClick={startTimer}>
            Start driving session
          </button>
        ) : (
          <div className="timer-running">
            <div className="timer-display">
              {new Date(elapsedSec * 1000).toISOString().substr(11, 8)}
            </div>
            <label className="night-toggle">
              <input type="checkbox" checked={night} onChange={(e) => setNight(e.target.checked)} />
              Night driving
            </label>
            <input
              type="text"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="stop-button" onClick={stopTimer}>
              Stop &amp; save
            </button>
          </div>
        )}
      </section>

      <details className="manual-entry">
        <summary>Add a past session manually</summary>
        <form onSubmit={handleManualSubmit}>
          <div className="hours-minutes-row">
            <input
              type="number"
              min="0"
              placeholder="Hours"
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Minutes"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
            />
          </div>
          <input
            type="datetime-local"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
          />
          <label className="night-toggle">
            <input type="checkbox" checked={night} onChange={(e) => setNight(e.target.checked)} />
            Night driving
          </label>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit">Add session</button>
        </form>
      </details>

      <section className="history">
        <h2>History</h2>
        {loading ? (
          <p>Loading...</p>
        ) : sessions.length === 0 ? (
          <p>No sessions logged yet.</p>
        ) : (
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <div className="session-main">
                  <span>{new Date(s.started_at).toLocaleDateString()}</span>
                  <span>{formatMinutes(s.minutes)}</span>
                  {s.night && <span className="badge">Night</span>}
                </div>
                {s.notes && <div className="session-notes">{s.notes}</div>}
                <button className="delete-button" onClick={() => deleteSession(s.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Tracker
