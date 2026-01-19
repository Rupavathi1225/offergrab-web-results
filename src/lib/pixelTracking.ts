/**
 * Meta Pixel Event Tracking Module
 * 
 * This module handles all Meta Pixel (Facebook Pixel) event tracking with a clean, 
 * maintainable approach following React best practices.
 * 
 * Events tracked:
 * - PageView: When user lands on a page
 * - ViewContent: When user views the web results content
 * - InboundClick: When user clicks internal related search links
 * - OutboundClick: When user clicks external links
 */

declare global {
  interface Window {
    fbq: ((action: string, event: string, data?: Record<string, any>) => void) & {
      callQueue?: any[];
    };
  }
}

/**
 * Initialize Meta Pixel
 * Call this once on app initialization (in main.tsx or App component)
 */
export const initMetaPixel = (): void => {
  if (window.fbq) {
    // Pixel already initialized
    return;
  }

  // Set up fbq stub function in case script hasn't loaded yet
  window.fbq = function (...args: any[]) {
    if (window.fbq.callQueue) {
      window.fbq.callQueue.push(args);
    } else {
      window.fbq.callQueue = [args];
    }
  };

  // Track initial PageView when pixel initializes
  window.fbq('init', import.meta.env.VITE_META_PIXEL_ID || '');
  window.fbq('track', 'PageView');
};

/**
 * Track PageView Event
 * Triggered when user lands on a page
 * 
 * @param pageName - Name of the page for easier identification
 */
export const trackPageView = (pageName: string): void => {
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel not initialized');
    return;
  }

  try {
    window.fbq('track', 'PageView');
    console.log(`[Meta Pixel] PageView tracked: ${pageName}`);
  } catch (error) {
    console.error('[Meta Pixel] Error tracking PageView:', error);
  }
};

/**
 * Track ViewContent Event
 * Triggered when user views product/content listings
 * Commonly used on category/search results pages
 * 
 * @param contentName - Name of the content being viewed
 * @param contentCategory - Category of content
 * @param contentIds - Array of item IDs being viewed
 */
export const trackViewContent = (
  contentName: string,
  contentCategory: string,
  contentIds: string[]
): void => {
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel not initialized');
    return;
  }

  try {
    window.fbq('track', 'ViewContent', {
      content_name: contentName,
      content_category: contentCategory,
      content_ids: contentIds,
      content_type: 'product',
      currency: 'USD',
    });
    console.log(`[Meta Pixel] ViewContent tracked: ${contentName}`);
  } catch (error) {
    console.error('[Meta Pixel] Error tracking ViewContent:', error);
  }
};

/**
 * Track InboundClick Event
 * Triggered when user clicks an internal link (stays within our app)
 * 
 * @param searchText - The search text or link title user clicked
 * @param targetPage - The internal page/route being navigated to
 * @param contentId - ID of the related search or link
 */
export const trackInboundClick = (
  searchText: string,
  targetPage: string,
  contentId: string
): void => {
  console.log('[Meta Pixel] trackInboundClick called with:', { searchText, targetPage, contentId });
  
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel not initialized - window.fbq is undefined');
    return;
  }

  try {
    console.log('[Meta Pixel] Calling fbq with Link event...');
    // Using 'Link' event for internal navigation
    window.fbq('track', 'Link', {
      content_name: searchText,
      content_category: 'internal_navigation',
      content_id: contentId,
      value: targetPage,
      currency: 'USD',
    });
    console.log(`[Meta Pixel] InboundClick tracked: ${searchText} -> ${targetPage}`);
  } catch (error) {
    console.error('[Meta Pixel] Error tracking InboundClick:', error);
  }
};

/**
 * Track OutboundClick Event
 * Triggered when user clicks an external link that leaves our domain
 * 
 * @param linkText - The text/title of the link user clicked
 * @param externalUrl - The external URL being navigated to
 * @param contentId - ID of the item being clicked
 */
export const trackOutboundClick = (
  linkText: string,
  externalUrl: string,
  contentId: string
): void => {
  if (typeof window.fbq === 'undefined') {
    console.warn('Meta Pixel not initialized');
    return;
  }

  try {
    window.fbq('track', 'Contact', {
      content_name: linkText,
      content_category: 'outbound_click',
      content_id: contentId,
      value: externalUrl,
      currency: 'USD',
    });
    console.log(`[Meta Pixel] OutboundClick tracked: ${linkText} -> ${externalUrl}`);
  } catch (error) {
    console.error('[Meta Pixel] Error tracking OutboundClick:', error);
  }
};

/**
 * Helper: Determine if a URL is external
 * Returns true if URL points outside our domain
 * 
 * @param url - The URL to check
 * @returns boolean - true if external, false if internal
 */
export const isExternalUrl = (url: string): boolean => {
  // Check if URL is absolute and not our domain
  try {
    const urlObj = new URL(url, window.location.href);
    const currentDomain = window.location.hostname;
    return !urlObj.hostname.includes(currentDomain);
  } catch {
    // If URL parsing fails, treat as external
    return true;
  }
};

/**
 * Track Related Search Click
 * Automatically determines if link is internal or external
 * 
 * @param searchText - The search text/link title
 * @param targetUrl - The URL being navigated to
 * @param contentId - ID of the related search
 */
export const trackRelatedSearchClick = (
  searchText: string,
  targetUrl: string,
  contentId: string
): void => {
  if (isExternalUrl(targetUrl)) {
    trackOutboundClick(searchText, targetUrl, contentId);
  } else {
    trackInboundClick(searchText, targetUrl, contentId);
  }
};
