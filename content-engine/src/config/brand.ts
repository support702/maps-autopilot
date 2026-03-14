/**
 * Brand Configuration
 * Colors, fonts, logo paths, and composition settings
 */

export const FPS = 30;
export const END_CARD_DURATION_FRAMES = 90; // 3 seconds at 30fps
export const DEFAULT_CTA_TEXT = 'Start Ranking Today';

export const brandConfig = {
  colors: {
    primary: '#F5820A', // Orange - highlight, current word
    secondary: '#FFFFFF', // White - previous words
    background: '#0A0A0C', // Dark background
    red: '#FF4444', // Pain points
    green: '#00E676', // Solution/success
  },
  
  fonts: {
    caption: 'Montserrat',
    captionWeight: '700',
    body: 'Inter',
  },
  
  logo: '/Users/titanbot/maps-autopilot/content-engine/assets/logo.png',
  
  caption: {
    strokeWidth: 2,
    strokeColor: '#000000',
    fontSize: 48,
    lineHeight: 1.3,
    wordsPerScreen: 5,
    position: 'bottom-third', // Center-bottom third of frame
  },
  
  endCard: {
    duration: 90, // 3 seconds at 30fps
    ctaText: 'Start Ranking Today',
    fadeInDuration: 15,
  },
};
