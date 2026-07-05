import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useHousehold } from './HouseholdContext'

function Dashboard() {
  const { household, refresh } = useHousehold()
  const [userId, setUserId] = useState(null)
  const [trackers, setTrackers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newGoalHours, setNewGoalHours] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchTrackers()

    const channel = supabase
      .channel('trackers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trackers' }, () =>
        fetchTrackers()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  async function handleLeaveHousehold() {
    if (!confirm(`Leave "${household.name}"? You'll need an invite code to rejoin.`)) return

    await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('user_id', userId)

    await refresh()
  }

  async function handleDeleteHousehold() {
    if (
      !confirm(
        `Permanently delete "${household.name}"? This removes all its trackers and history for everyone.`
      )
    )
      return

    await supabase.from('households').delete().eq('id', household.id)
    await refresh()
  }

  async function fetchTrackers() {
    const { data, error } = await supabase
      .from('trackers')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error) setTrackers(data)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const goalHours = parseInt(newGoalHours, 10)

    await supabase.from('trackers').insert({
      name: newName.trim(),
      created_by: user.id,
      household_id: household.id,
      ...(goalHours > 0 ? { goal_hours: goalHours } : {}),
    })

    setNewName('')
    setNewGoalHours('')
  }

  async function deleteTracker(id) {
    await supabase.from('trackers').delete().eq('id', id)
    fetchTrackers()
  }

  function startEditing(t) {
    setEditingId(t.id)
    setEditingName(t.name)
  }

  async function handleRename(e) {
    e.preventDefault()
    if (!editingName.trim()) return

    await supabase.from('trackers').update({ name: editingName.trim() }).eq('id', editingId)

    setEditingId(null)
    setEditingName('')
  }

  return (
    <div className="dashboard">
      <h2>{household?.name}</h2>
      {household && (
        <p className="invite-code">
          Invite code: <strong>{household.invite_code}</strong> — share this so others can join
          your household
        </p>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : trackers.length === 0 ? (
        <p>No trackers yet — create one below.</p>
      ) : (
        <ul className="tracker-list">
          {trackers.map((t) =>
            editingId === t.id ? (
              <li key={t.id}>
                <form className="rename-form" onSubmit={handleRename}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li key={t.id}>
                <Link to={`/trackers/${t.id}`} className="tracker-link">
                  {t.name}
                </Link>
                <div className="tracker-actions">
                  <button className="link-button" onClick={() => startEditing(t)}>
                    Rename
                  </button>
                  <button className="delete-button" onClick={() => deleteTracker(t.id)}>
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      <form className="new-tracker-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New tracker name (e.g. Emma's permit)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <input
          type="number"
          min="1"
          placeholder="Goal hours (default 40)"
          value={newGoalHours}
          onChange={(e) => setNewGoalHours(e.target.value)}
        />
        <button type="submit">Create tracker</button>
      </form>

      {household && (
        <div className="household-actions">
          <button className="link-button" onClick={handleLeaveHousehold}>
            Leave household
          </button>
          {household.created_by === userId && (
            <button className="delete-button" onClick={handleDeleteHousehold}>
              Delete household
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
