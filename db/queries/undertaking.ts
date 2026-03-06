import { supabase } from '@/lib/supabase'
import { UndertakingForm } from '../schema'

export const createUndertakingForm = async (data: Omit<UndertakingForm, 'id' | 'created_at' | 'updated_at'>) => {
  const { data: result, error } = await supabase
    .from('undertaking_forms')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return result
}

export const getUndertakingFormsByApplicant = async (applicantId: string) => {
  const { data, error } = await supabase
    .from('undertaking_forms')
    .select('*')
    .eq('applicant_id', applicantId)
    .order('submitted_date', { ascending: false })

  if (error) throw error
  return data || []
}

export const getUndertakingFormById = async (id: string) => {
  const { data, error } = await supabase
    .from('undertaking_forms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export const updateUndertakingForm = async (
  id: string,
  updates: Partial<UndertakingForm>
) => {
  const { data, error } = await supabase
    .from('undertaking_forms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUndertakingAcceptances = async (formId: string) => {
  const { data, error } = await supabase
    .from('undertaking_acceptances')
    .select('*')
    .eq('undertaking_form_id', formId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
