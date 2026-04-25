import { supabase } from '../supabase/client.ts'
import type { Tables, TablesInsert } from '../supabase/types.ts'

export type ProfessionalRow = Tables<'professionals'>
export type ProfessionalInsert = TablesInsert<'professionals'>
type ProfessionalCreateInput = Omit<ProfessionalInsert, 'workspace_id' | 'id' | 'created_at' | 'updated_at'>

export async function listProfessionals(workspaceId: string): Promise<ProfessionalRow[]> {
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list professionals: ${error.message}`)
  }
  return data ?? []
}

export async function createProfessional(workspaceId: string, payload: ProfessionalCreateInput): Promise<ProfessionalRow> {
  const { data, error } = await supabase
    .from('professionals')
    .insert({ ...payload, workspace_id: workspaceId })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create professional: ${error.message}`)
  }
  return data
}
