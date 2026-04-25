import { supabase } from '../supabase/client.ts'
import type { Tables, TablesInsert } from '../supabase/types.ts'

export type MarketplaceListingRow = Tables<'marketplace_listings'>
export type MarketplaceListingInsert = TablesInsert<'marketplace_listings'>
type MarketplaceListingCreateInput = Omit<MarketplaceListingInsert, 'workspace_id' | 'id' | 'created_at' | 'updated_at'>

export async function listMarketplaceListings(workspaceId: string): Promise<MarketplaceListingRow[]> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list marketplace listings: ${error.message}`)
  }
  return data ?? []
}

export async function createMarketplaceListing(workspaceId: string, payload: MarketplaceListingCreateInput): Promise<MarketplaceListingRow> {
  const { data, error } = await supabase
    .from('marketplace_listings')
    .insert({ ...payload, workspace_id: workspaceId })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create marketplace listing: ${error.message}`)
  }
  return data
}

export async function deleteMarketplaceListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('marketplace_listings')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete marketplace listing: ${error.message}`)
  }
}
