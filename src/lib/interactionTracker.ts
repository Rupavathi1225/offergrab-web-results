/**
 * Session-based interaction tracker to prevent unwanted fallback redirects.
 * Once a user interacts with the page (clicks related search, web result, or any link),
 * the redirect should be permanently cancelled for that session.
 */

const INTERACTION_KEY = 'offergrab_user_interacted';

/**
 * Mark that the user has interacted with the page.
 * This will permanently disable auto-redirects for the current session.
 */
export const markUserInteraction = (): void => {
  sessionStorage.setItem(INTERACTION_KEY, 'true');
};

/**
 * Check if the user has already interacted with the page in this session.
 * @returns true if user has interacted, false otherwise
 */
export const hasUserInteracted = (): boolean => {
  return sessionStorage.getItem(INTERACTION_KEY) === 'true';
};

/**
 * Clear the interaction flag (useful for testing or admin override)
 */
export const clearUserInteraction = (): void => {
  sessionStorage.removeItem(INTERACTION_KEY);
};
