import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get VIP roles expiring in exactly 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const startOfDay = new Date(threeDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: expiringVips, error: vipError } = await supabase
      .from('user_roles')
      .select('user_id, expires_at')
      .eq('role', 'vip')
      .gte('expires_at', startOfDay.toISOString())
      .lte('expires_at', endOfDay.toISOString());

    if (vipError) {
      console.error('Error fetching expiring VIPs:', vipError);
      throw vipError;
    }

    console.log(`Found ${expiringVips?.length || 0} VIPs expiring in 3 days`);

    const notifications = [];

    for (const vip of expiringVips || []) {
      // Check if notification already sent today for this user
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingNotification } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', vip.user_id)
        .eq('type', 'vip_expiring')
        .gte('created_at', today.toISOString())
        .maybeSingle();

      if (!existingNotification) {
        const expirationDate = new Date(vip.expires_at);
        const formattedDate = expirationDate.toLocaleDateString('pt-BR');

        notifications.push({
          user_id: vip.user_id,
          type: 'vip_expiring',
          title: 'Seu VIP está expirando!',
          message: `Seu status VIP expira em ${formattedDate}. Renove para continuar aproveitando os benefícios exclusivos.`,
          data: { expires_at: vip.expires_at }
        });
      }
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log(`Created ${notifications.length} expiration notifications`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notified: notifications.length,
        total_expiring: expiringVips?.length || 0
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error("Error in notify-vip-expiration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});