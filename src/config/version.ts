// This file is the single source of truth for the application version.
// Update this when releasing new versions.

export const APP_VERSION = '1.0.0-alpha.1';
export const APP_STAGE = 'ALPHA'; // 'ALPHA' | 'BETA' | 'RC' | 'STABLE'

export const BUILD_METADATA = {
    buildDate: new Date().toISOString(),
    commit: 'HEAD' // Ideally replaced during build time in CI/CD
};
