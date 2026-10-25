-- Migration 044: Extension Marketplace System
-- Purpose: Official registry for publishing and discovering extensions
-- Created: 2026-02-28

-- Extension Registry (Official Published Extensions)
CREATE TABLE IF NOT EXISTS extension_registry (
  id TEXT PRIMARY KEY, -- Extension ID (e.g., 'weather-api')
  name TEXT NOT NULL, -- Display name
  description TEXT, -- Short description
  author TEXT NOT NULL, -- Author name or organization
  author_email TEXT, -- Contact email
  author_url TEXT, -- Author website/GitHub
  version TEXT NOT NULL, -- Current version (semver)
  type TEXT NOT NULL CHECK(type IN ('app', 'channel', 'tool', 'integration')), -- Extension type
  category TEXT, -- Category (productivity, communication, developer-tools, etc.)
  tags TEXT, -- JSON array of tags for search
  icon_url TEXT, -- Icon image URL
  screenshot_urls TEXT, -- JSON array of screenshot URLs
  download_url TEXT NOT NULL, -- Direct download URL for extension package
  homepage_url TEXT, -- Extension homepage/docs
  repository_url TEXT, -- GitHub/GitLab repo URL
  license TEXT DEFAULT 'MIT', -- License type
  min_agent_version TEXT, -- Minimum Dpro Bot version required
  permissions TEXT, -- JSON array of required permissions
  dependencies TEXT, -- JSON array of required extension dependencies
  install_count INTEGER DEFAULT 0, -- Total installation count
  rating_avg REAL DEFAULT 0.0, -- Average rating (0-5)
  rating_count INTEGER DEFAULT 0, -- Number of ratings
  featured BOOLEAN DEFAULT 0, -- Featured extension (curated by admin)
  verified BOOLEAN DEFAULT 0, -- Verified by admin
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'deprecated', 'removed')),
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Extension Versions (Version History)
CREATE TABLE IF NOT EXISTS extension_versions (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL, -- FK to extension_registry.id
  version TEXT NOT NULL, -- Version number (semver)
  changelog TEXT, -- Release notes
  download_url TEXT NOT NULL, -- Download URL for this version
  min_agent_version TEXT, -- Minimum Dpro Bot version
  breaking_changes BOOLEAN DEFAULT 0, -- Has breaking changes from previous version
  release_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (extension_id) REFERENCES extension_registry(id) ON DELETE CASCADE,
  UNIQUE(extension_id, version)
);

-- Extension Installations (User Install Tracking)
CREATE TABLE IF NOT EXISTS extension_installations (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL, -- FK to extension_registry.id
  user_id TEXT NOT NULL, -- FK to users.id
  installed_version TEXT NOT NULL, -- Currently installed version
  install_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_update_check DATETIME, -- Last time checked for updates
  auto_update BOOLEAN DEFAULT 1, -- Auto-update enabled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(extension_id, user_id)
);

-- Extension Reviews (User Reviews & Ratings)
CREATE TABLE IF NOT EXISTS extension_reviews (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL, -- FK to extension_registry.id
  user_id TEXT NOT NULL, -- FK to users.id
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5), -- 1-5 stars
  review_title TEXT,
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0, -- Upvote count
  version TEXT, -- Version reviewed
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (extension_id) REFERENCES extension_registry(id) ON DELETE CASCADE,
  UNIQUE(extension_id, user_id) -- One review per user per extension
);

-- Extension Update Queue (Pending Updates)
CREATE TABLE IF NOT EXISTS extension_update_queue (
  id TEXT PRIMARY KEY,
  extension_id TEXT NOT NULL, -- FK to extension_registry.id
  user_id TEXT NOT NULL, -- FK to users.id
  current_version TEXT NOT NULL, -- Currently installed version
  target_version TEXT NOT NULL, -- Version to update to
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT, -- Error if update failed
  scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- When update was scheduled
  completed_at DATETIME, -- When update finished
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_registry_status ON extension_registry(status);
CREATE INDEX IF NOT EXISTS idx_registry_category ON extension_registry(category);
CREATE INDEX IF NOT EXISTS idx_registry_featured ON extension_registry(featured) WHERE featured = 1;
CREATE INDEX IF NOT EXISTS idx_registry_verified ON extension_registry(verified) WHERE verified = 1;
CREATE INDEX IF NOT EXISTS idx_versions_extension ON extension_versions(extension_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_installations_user ON extension_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_installations_extension ON extension_installations(extension_id);
CREATE INDEX IF NOT EXISTS idx_reviews_extension ON extension_reviews(extension_id);
CREATE INDEX IF NOT EXISTS idx_update_queue_user ON extension_update_queue(user_id, status);
