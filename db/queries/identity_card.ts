import { supabase } from '@/lib/supabase'
import { IdentityCardForm } from '../schema'

export const createIdentityCardForm = async (data: Omit<IdentityCardForm, 'id' | 'created_at' | 'updated_at'>) => {
  const { data: result, error } = await supabase
    .from('identity_card_forms')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return result
}

export const getIdentityCardFormsByApplicant = async (applicantId: string) => {
  const { data, error } = await supabase
    .from('identity_card_forms')
    .select('*')
    .eq('applicant_id', applicantId)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data || []
}

export const getIdentityCardFormById = async (id: string) => {
  const { data, error } = await supabase
    .from('identity_card_forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const updateIdentityCardForm = async (
  id: string,
  updates: Partial<IdentityCardForm>
) => {
  const { data, error } = await supabase
    .from('identity_card_forms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getIdentityCardApprovals = async (formId: string) => {
  const { data, error } = await supabase
    .from('identity_card_approvals')
    .select('*')
    .eq('identity_card_form_id', formId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
