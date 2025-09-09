"use client";

/**
 * Cookie-based announcement read tracking utilities
 * Stores read announcement IDs in cookies for 2 weeks
 */

const COOKIE_NAME = 'readAnnouncements';
const COOKIE_EXPIRY_DAYS = 14; // 2 weeks

interface ReadAnnouncementData {
  announcementIds: number[];
  lastUpdated: string;
}

/**
 * Get read announcement IDs from cookies
 */
export function getReadAnnouncementIds(): number[] {
  try {
    if (typeof document === 'undefined') return [];
    
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')[1];
    
    if (!cookieValue) return [];
    
    const decoded = decodeURIComponent(cookieValue);
    const data: ReadAnnouncementData = JSON.parse(decoded);
    
    // Check if data is expired (older than 2 weeks)
    const lastUpdated = new Date(data.lastUpdated);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - COOKIE_EXPIRY_DAYS);
    
    if (lastUpdated < twoWeeksAgo) {
      // Clear expired data
      clearReadAnnouncements();
      return [];
    }
    
    return data.announcementIds || [];
  } catch (error) {
    console.error('Error reading announcement cookies:', error);
    return [];
  }
}

/**
 * Mark announcements as read by adding their IDs to cookies
 */
export function markAnnouncementsAsRead(announcementIds: number[]): void {
  try {
    if (typeof document === 'undefined') return;
    
    const currentIds = getReadAnnouncementIds();
    const newIds = [...currentIds];
    
    // Add new IDs that aren't already in the list
    announcementIds.forEach(id => {
      if (!newIds.includes(id)) {
        newIds.push(id);
      }
    });
    
    // Limit the array size to prevent cookie from getting too large
    // Keep only the most recent 500 announcement IDs
    const maxIds = 500;
    const idsToStore = newIds.slice(-maxIds);
    
    const data: ReadAnnouncementData = {
      announcementIds: idsToStore,
      lastUpdated: new Date().toISOString()
    };
    
    const encoded = encodeURIComponent(JSON.stringify(data));
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_EXPIRY_DAYS);
    
    document.cookie = `${COOKIE_NAME}=${encoded}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    
    console.log(`📖 Marked ${announcementIds.length} announcements as read (${idsToStore.length} total tracked)`);
  } catch (error) {
    console.error('Error marking announcements as read:', error);
  }
}

/**
 * Check if user has read a specific announcement
 */
export function isAnnouncementRead(announcementId: number): boolean {
  const readIds = getReadAnnouncementIds();
  return readIds.includes(announcementId);
}

/**
 * Clear all read announcement tracking
 */
export function clearReadAnnouncements(): void {
  try {
    if (typeof document === 'undefined') return;
    
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log('📖 Cleared all read announcement tracking');
  } catch (error) {
    console.error('Error clearing read announcements:', error);
  }
}

/**
 * Filter announcements to exclude those already read
 */
export function filterUnreadAnnouncements<T extends { id: number }>(announcements: T[]): T[] {
  const readIds = getReadAnnouncementIds();
  return announcements.filter(announcement => !readIds.includes(announcement.id));
}

/**
 * Check if user has any unread announcements
 */
export function hasUnreadAnnouncements<T extends { id: number }>(announcements: T[]): boolean {
  return filterUnreadAnnouncements(announcements).length > 0;
}

/**
 * Get stats about read announcements (for debugging)
 */
export function getReadAnnouncementStats() {
  const readIds = getReadAnnouncementIds();
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];
  
  return {
    totalRead: readIds.length,
    cookieSize: cookieValue ? cookieValue.length : 0,
    lastUpdated: (() => {
      try {
        if (!cookieValue) return null;
        const data: ReadAnnouncementData = JSON.parse(decodeURIComponent(cookieValue));
        return data.lastUpdated;
      } catch {
        return null;
      }
    })()
  };
}