import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = 'offergrab_session_id';

export const getOrCreateSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
};

export const getSource = (): string => {
  const referrer = document.referrer;
  if (!referrer) return 'direct';
  
  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();
    
    if (hostname.includes('google')) return 'google';
    if (hostname.includes('facebook')) return 'facebook';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('instagram')) return 'instagram';
    if (hostname.includes('linkedin')) return 'linkedin';
    
    return hostname;
  } catch {
    return 'direct';
  }
};

export const initSession = async (): Promise<void> => {
  const sessionId = getOrCreateSessionId();
  const device = getDeviceType();
  const source = getSource();
  const userAgent = navigator.userAgent;

  try {
    // Try to get IP and country from multiple fallback APIs
    let ipAddress = '';
    let country = 'Unknown';
    let countryCode = 'XX';

    // Try ipapi.co first
    try {
      const ipResponse = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip || '';
        country = ipData.country_name || 'Unknown';
        countryCode = ipData.country_code || 'XX';
      }
    } catch (e) {
      console.log('ipapi.co failed, trying ipwho.is');
    }

    // Try ipwho.is as fallback
    if (!ipAddress || countryCode === 'XX') {
      try {
        const ipResponse = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3000) });
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.success) {
            ipAddress = ipData.ip || ipAddress;
            country = ipData.country || country;
            countryCode = ipData.country_code || countryCode;
          }
        }
      } catch (e) {
        console.log('ipwho.is failed, trying cloudflare');
      }
    }

    // Try Cloudflare trace as last resort
    if (!ipAddress || countryCode === 'XX') {
      try {
        const cfResponse = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(3000) });
        if (cfResponse.ok) {
          const text = await cfResponse.text();
          const ipMatch = text.match(/ip=([^\n]+)/);
          const locMatch = text.match(/loc=([^\n]+)/);
          if (ipMatch) ipAddress = ipMatch[1];
          if (locMatch && locMatch[1] !== 'XX') {
            countryCode = locMatch[1];
            country = locMatch[1]; // Just use code as country name
          }
        }
      } catch (e) {
        console.log('All IP APIs failed');
      }
    }

    // Check if session exists
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id, page_views')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existingSession) {
      // Update existing session
      await supabase
        .from('sessions')
        .update({
          page_views: existingSession.page_views + 1,
          last_active: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
    } else {
      // Create new session
      await supabase
        .from('sessions')
        .insert({
          session_id: sessionId,
          ip_address: ipAddress,
          country,
          country_code: countryCode,
          source,
          device,
          user_agent: userAgent,
          page_views: 1,
        });
    }
  } catch (error) {
    console.error('Error initializing session:', error);
  }
};

export const trackClick = async (
  clickType: 'related_search' | 'web_result' | 'prelanding_submit' | 'landing2_view' | 'landing2_click' | 'fallback_redirect' | 'thankyou_view' | 'sitelink' | 'wr201_sponsored',
  itemId?: string,
  itemName?: string,
  page?: string,
  lid?: number,
  originalLink?: string
): Promise<void> => {
  const sessionId = getOrCreateSessionId();

  try {
    console.log('Tracking click:', { clickType, sessionId, itemName, page });
    const { data, error } = await supabase.from('clicks').insert({
      session_id: sessionId,
      click_type: clickType,
      item_id: itemId,
      item_name: itemName,
      page,
      lid,
      original_link: originalLink,
    }).select();
    
    if (error) {
      console.error('Error inserting click:', error);
    } else {
      console.log('Click tracked successfully:', data);
    }
  } catch (error) {
    console.error('Error tracking click:', error);
  }
};

export const updateTimeSpent = async (clickId: string, timeSpent: number): Promise<void> => {
  try {
    await supabase
      .from('clicks')
      .update({ time_spent: timeSpent })
      .eq('id', clickId);
  } catch (error) {
    console.error('Error updating time spent:', error);
  }
};
