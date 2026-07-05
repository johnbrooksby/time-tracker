import { useState } from 'react'
import { supabase } from './lib/supabase'

function Auth() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <div className="auth-card">
        <p>Check your email for a sign-in link. Open it on this device to log in.</p>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <p>Sign in with your email to start tracking driving hours.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending link...' : 'Send sign-in link'}
        </button>
      </form>
      {status === 'error' && <p className="error-text">{errorMsg}</p>}
    </div>
  )
}

export default Auth
