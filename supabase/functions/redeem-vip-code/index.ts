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
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { code } = await req.json()
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Código inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User ${user.id} attempting to redeem code: ${code.trim()}`)

    // Check if user already has VIP role
    const { data: existingRole } = await supabaseClient
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'vip')
      .maybeSingle()

    if (existingRole) {
      console.log(`User ${user.id} already has VIP role`)
      return new Response(
        JSON.stringify({ error: 'Você já possui o cargo VIP!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if code exists and is available (server-side validation)
    const { data: vipCode, error: codeError } = await supabaseClient
      .from('vip_codes')
      .select('*')
      .eq('code', code.trim())
      .eq('is_active', true)
      .is('used_by', null)
      .maybeSingle()

    if (codeError || !vipCode) {
      console.log(`Code not found or already used: ${code.trim()}`)
      return new Response(
        JSON.stringify({ error: 'Código inválido ou já utilizado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Valid code found: ${vipCode.id}, duration_days: ${vipCode.duration_days}`)

    // Mark code as used
    const { error: updateError } = await supabaseClient
      .from('vip_codes')
      .update({ 
        used_by: user.id, 
        used_at: new Date().toISOString() 
      })
      .eq('id', vipCode.id)

    if (updateError) {
      console.error('Error updating vip_codes:', updateError)
      return new Response(
        JSON.stringify({ error: 'Erro ao resgatar código. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate expiration date based on duration_days
    let expiresAt: string | null = null
    if (vipCode.duration_days && vipCode.duration_days > 0) {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + vipCode.duration_days)
      expiresAt = expirationDate.toISOString()
      console.log(`VIP will expire at: ${expiresAt}`)
    } else {
      console.log('VIP is permanent (no expiration)')
    }

    // Add VIP role to user with expiration if defined
    const roleInsert: { user_id: string; role: string; expires_at?: string } = {
      user_id: user.id,
      role: 'vip'
    }
    
    if (expiresAt) {
      roleInsert.expires_at = expiresAt
    }

    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert(roleInsert)

    if (roleError) {
      console.error('Error inserting user_roles:', roleError)
      return new Response(
        JSON.stringify({ error: 'Erro ao adicionar cargo VIP.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const successMessage = expiresAt 
      ? `Código VIP resgatado com sucesso! Válido por ${vipCode.duration_days} dias.`
      : 'Código VIP resgatado com sucesso! VIP permanente.'

    console.log(`VIP role added successfully for user ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, message: successMessage, expiresAt }),
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
