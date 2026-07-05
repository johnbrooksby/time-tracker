import { useState } from 'react'
import { supabase } from './lib/supabase'
import { useHousehold } from './HouseholdContext'

function HouseholdOnboarding() {
  const { refresh } = useHousehold()
  const [mode, setMode] = useState('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: newHousehold, error: createError } = await supabase
      .from('households')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setBusy(false)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: newHousehold.id, user_id: user.id })

    if (memberError) {
      setError(memberError.message)
      setBusy(false)
      return
    }

    await refresh()
  }

  async function handleJoin(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError('')

    const { data: found, error: lookupError } = await supabase
      .from('households')
      .select('id')
      .eq('invite_code', code.trim().toLowerCase())
      .maybeSingle()

    if (lookupError || !found) {
      setError('No household found with that invite code.')
      setBusy(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: found.id, user_id: user.id })

    if (memberError) {
      setError(memberError.message)
      setBusy(false)
      return
    }

    await refresh()
  }

  return (
    <div className="onboarding">
      <p>You're not part of a household yet.</p>
      <div className="onboarding-tabs">
        <button
          className={mode === 'create' ? 'onboarding-tab active' : 'onboarding-tab'}
          onClick={() => setMode('create')}
        >
          Create a household
        </button>
        <button
          className={mode === 'join' ? 'onboarding-tab active' : 'onboarding-tab'}
          onClick={() => setMode('join')}
        >
          Join with invite code
        </button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Household name (e.g. The Brooksbys)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" className="primary-button" disabled={busy}>
            Create household
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className="primary-button" disabled={busy}>
            Join household
          </button>
        </form>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export default HouseholdOnboarding
