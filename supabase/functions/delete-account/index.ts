import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for deletion operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })

    // Create user client to get the authenticated user
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.log('User authentication failed:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Deleting account for user: ${user.id}`)

    // Delete user data from all related tables (order matters due to foreign keys)
    // These deletions are handled by CASCADE in some cases, but we do it explicitly for safety
    
    // Delete reading progress
    await supabaseAdmin.from('reading_progress').delete().eq('user_id', user.id)
    console.log('Deleted reading progress')
    
    // Delete reading history
    await supabaseAdmin.from('reading_history').delete().eq('user_id', user.id)
    console.log('Deleted reading history')
    
    // Delete favorites
    await supabaseAdmin.from('favorites').delete().eq('user_id', user.id)
    console.log('Deleted favorites')
    
    // Delete comment likes
    await supabaseAdmin.from('comment_likes').delete().eq('user_id', user.id)
    console.log('Deleted comment likes')
    
    // Delete comments
    await supabaseAdmin.from('comments').delete().eq('user_id', user.id)
    console.log('Deleted comments')
    
    // Delete notifications
    await supabaseAdmin.from('notifications').delete().eq('user_id', user.id)
    console.log('Deleted notifications')
    
    // Delete user roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', user.id)
    console.log('Deleted user roles')
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)
    console.log('Deleted profile')

    // Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir conta. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully deleted account for user: ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Conta excluída com sucesso.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
