import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const IIT_EMAIL_DOMAIN = '@iitrpr.ac.in'

function isIitEmail(email: string) {
  return email.trim().toLowerCase().endsWith(IIT_EMAIL_DOMAIN)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body?.email || '').trim().toLowerCase()
    const password = String(body?.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (!isIitEmail(email)) {
      return NextResponse.json({ error: 'Only IIT Ropar emails are supported for auto-provisioning' }, { status: 403 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: email.split('@')[0],
      },
    })

    if (error) {
      const message = (error.message || '').toLowerCase()

      if (message.includes('already') || message.includes('exists') || message.includes('registered')) {
        return NextResponse.json({ error: 'Account already exists. Please use your password to sign in.' }, { status: 409 })
      }

      return NextResponse.json({ error: error.message || 'Failed to auto-provision account' }, { status: 500 })
    }

    return NextResponse.json({ message: 'IIT account provisioned successfully' }, { status: 201 })
  } catch (error) {
    console.error('IIT first login provisioning error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
