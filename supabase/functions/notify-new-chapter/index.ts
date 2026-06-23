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
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const { title_id, chapter_number, title_name } = await req.json()
    
    if (!title_id || !chapter_number || !title_name) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Notifying users about new chapter ${chapter_number} for title ${title_name}`)

    // Get all users who have favorited this title
    const { data: favorites, error: favoritesError } = await supabaseClient
      .from('favorites')
      .select('user_id')
      .eq('title_id', title_id)

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar favoritos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${favorites?.length || 0} users with this title favorited`)

    if (!favorites || favorites.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum usuário para notificar' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create notifications for all users
    const notifications = favorites.map(fav => ({
      user_id: fav.user_id,
      type: 'new_chapter',
      title: 'Novo capítulo disponível!',
      message: `${title_name} - Capítulo ${chapter_number} foi lançado!`,
      data: { title_id, chapter_number },
      read: false,
    }))

    const { error: insertError } = await supabaseClient
      .from('notifications')
      .insert(notifications)

    if (insertError) {
      console.error('Error inserting notifications:', insertError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar notificações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully created ${notifications.length} notifications`)

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in notify-new-chapter:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})