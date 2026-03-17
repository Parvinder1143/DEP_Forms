import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service role key not configured' }, 
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Get user from token
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token)
    
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ message: 'User already synced' }, { status: 200 })
    }

    // Create user record in users table
    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user_type: 'employee',
      })

    if (insertError) {
      console.error('Error creating user record:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create user record',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'User synced successfully' }, { status: 200 })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
