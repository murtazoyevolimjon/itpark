import React from 'react';

export const UzFlag: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
  >
    <rect width="32" height="10.66" fill="#0099B5" />
    <rect y="10.66" width="32" height="1.33" fill="#CE1126" />
    <rect y="12" width="32" height="8" fill="#FFFFFF" />
    <rect y="20" width="32" height="1.33" fill="#CE1126" />
    <rect y="21.33" width="32" height="10.67" fill="#1EB53A" />
    <circle cx="7.5" cy="5.33" r="3.2" fill="#FFFFFF" />
    <circle cx="8.6" cy="5.33" r="2.8" fill="#0099B5" />
  </svg>
);

export const GbFlag: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
  >
    <rect width="32" height="32" fill="#012169" />
    <path d="M0 0 L32 32 M32 0 L0 32" stroke="#FFFFFF" strokeWidth="4.5" />
    <path d="M0 0 L32 32 M32 0 L0 32" stroke="#C8102E" strokeWidth="2" />
    <path d="M16 0 V32 M0 16 H32" stroke="#FFFFFF" strokeWidth="6.5" />
    <path d="M16 0 V32 M0 16 H32" stroke="#C8102E" strokeWidth="3.6" />
  </svg>
);

export const RuFlag: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    style={{ borderRadius: '50%', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
  >
    <rect width="32" height="10.66" fill="#FFFFFF" />
    <rect y="10.66" width="32" height="10.67" fill="#0039A6" />
    <rect y="21.33" width="32" height="10.67" fill="#D52B1E" />
  </svg>
);
