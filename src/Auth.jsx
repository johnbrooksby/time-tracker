import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const RESEND_COOLDOWN_SECONDS = 60

function Auth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function sendLink() {
    setSending(true)
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setSending(false)

    if (error) {
      const hasUsefulMessage = error.message && error.message !== '{}'
      setErrorMsg(
        hasUsefulMessage
          ? error.message
          : `The server couldn't send the sign-in email${error.status ? ` (error ${error.status})` : ''}. This is most likely an email-delivery problem on the server, not your address.`
      )
    } else {
      setSent(true)
      setCooldown(RESEND_COOLDOWN_SECONDS)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendLink()
  }

  if (sent) {
    return (
      <div className="auth-card">
        <p>
          We sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to log
          in. If it doesn't show up, check your spam folder or send another.
        </p>
        <button type="button" onClick={sendLink} disabled={sending || cooldown > 0}>
          {sending ? 'Sending...' : cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setSent(false)
            setErrorMsg('')
          }}
        >
          Use a different email
        </button>
        {errorMsg && <p className="error-text">{errorMsg}</p>}
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
        <button type="submit" disabled={sending}>
          {sending ? 'Sending link...' : 'Send sign-in link'}
        </button>
      </form>
      {errorMsg && <p className="error-text">{errorMsg}</p>}
    </div>
  )
}

export default Auth
