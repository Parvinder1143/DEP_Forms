'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

const IIT_EMAIL_DOMAIN = '@iitrpr.ac.in'

function isIitEmail(email: string) {
  return email.trim().toLowerCase().endsWith(IIT_EMAIL_DOMAIN)
}

interface AuthContextType {
  user: any | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: email.split('@')[0],
        }
      }
    })
    if (error) throw error

    // Sync user to public users table
    if (data.session?.access_token) {
      try {
        await fetch('/api/auth-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (syncError) {
        console.error('Failed to sync user:', syncError)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Auto-provision IIT Ropar users on first login so signup is not required.
    if (error && isIitEmail(email)) {
      const provisionResponse = await fetch('/api/iit-first-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (provisionResponse.ok) {
        const secondAttempt = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        data = secondAttempt.data
        error = secondAttempt.error
      }
    }

    if (error) throw error

    // Sync user to public users table
    if (data.session?.access_token) {
      try {
        await fetch('/api/auth-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      } catch (syncError) {
        console.error('Failed to sync user:', syncError)
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
