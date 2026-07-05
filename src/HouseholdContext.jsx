import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'

const HouseholdContext = createContext(null)

export function HouseholdProvider({ children }) {
  const [household, setHousehold] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setHousehold(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('household_members')
      .select('households(*)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      setHousehold(data.households)
    } else {
      setHousehold(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <HouseholdContext.Provider value={{ household, loading, refresh }}>
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  return useContext(HouseholdContext)
}
