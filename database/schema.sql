-- =============================================================================
-- Rajdhani Connects - Contractor Rewards Platform
-- MySQL 8.0+ / MariaDB 10.5+ schema (Phase 1)
--
-- How to install on your hosting:
--   1. Create an empty database and a user with full privileges on it
--      (e.g. via cPanel > MySQL Databases or phpMyAdmin).
--   2. Import this file into that database (phpMyAdmin > Import, or
--      `mysql -u USER -p DBNAME < schema.sql`).
--   3. Set these environment variables on the app (v0 Settings > Vars, or Vercel):
--        DB_HOST              your MySQL host (e.g. mysql.example.com)
--        DB_PORT              3306 (optional, defaults to 3306)
--        DB_NAME              the database name
--        DB_USERNAME          the database user
--        DB_PASSWORD          that user's password
--        DB_SSL               optional, set to "true" if your host requires SSL
--        SUPER_ADMIN_EMAIL    the email you will use to sign in to /admin/login
--        SUPER_ADMIN_PASSWORD a strong password (min 10 chars) for the first login
--      On the first admin sign-in the Super Admin account is created with a
--      bcrypt hash of that password. After that the env password is ignored.
--   4. Your MySQL host must accept remote connections from Vercel
--      (cPanel > Remote MySQL > add host `%`, or your provider's equivalent).
--
-- Notes
--   * All money is stored as DECIMAL(12,2), all points/tokens as BIGINT.
--   * reward_transactions is an append-only ledger. Never UPDATE or DELETE rows;
--     corrections are posted as reversal / manual_debit entries.
--   * reward_balances is a cached projection of the ledger, updated in the same
--     database transaction as every ledger insert.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Admins & authentication
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(120)    NOT NULL,
  email           VARCHAR(190)    NOT NULL,
  username        VARCHAR(60)     NULL,
  password_hash   VARCHAR(100)    NOT NULL,
  role            ENUM('super_admin','admin') NOT NULL DEFAULT 'admin',
  status          ENUM('active','disabled')   NOT NULL DEFAULT 'active',
  failed_attempts INT UNSIGNED    NOT NULL DEFAULT 0,
  locked_until    DATETIME        NULL,
  last_login_at   DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Contractors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contractors (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_code      VARCHAR(20)     NULL,
  name                 VARCHAR(120)    NOT NULL,
  mobile               CHAR(10)        NOT NULL,
  alternate_mobile     CHAR(10)        NULL,
  email                VARCHAR(190)    NULL,
  photo_url            VARCHAR(500)    NULL,
  address              VARCHAR(255)    NULL,
  area                 VARCHAR(120)    NULL,
  city                 VARCHAR(80)     NULL,
  district             VARCHAR(80)     NULL,
  state                VARCHAR(80)     NULL,
  pin_code             CHAR(6)         NULL,
  joining_date         DATE            NOT NULL,
  notes                TEXT            NULL,
  verification_status  ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  account_status       ENUM('pending_approval','active','suspended','inactive','archived') NOT NULL DEFAULT 'pending_approval',
  approved_at          DATETIME        NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  created_by_admin_id  BIGINT UNSIGNED NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_contractors_code (contractor_code),
  UNIQUE KEY uq_contractors_mobile (mobile),
  KEY idx_contractors_status (account_status, verification_status),
  KEY idx_contractors_area (area),
  KEY idx_contractors_created (created_at),
  CONSTRAINT fk_contractors_approved_by FOREIGN KEY (approved_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL,
  CONSTRAINT fk_contractors_created_by  FOREIGN KEY (created_by_admin_id)  REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contractor_credentials (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_id        BIGINT UNSIGNED NOT NULL,
  username             VARCHAR(60)     NOT NULL,
  password_hash        VARCHAR(100)    NOT NULL,
  must_change_password TINYINT(1)      NOT NULL DEFAULT 1,
  failed_attempts      INT UNSIGNED    NOT NULL DEFAULT 0,
  locked_until         DATETIME        NULL,
  password_changed_at  DATETIME        NULL,
  last_login_at        DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_credentials_contractor (contractor_id),
  UNIQUE KEY uq_credentials_username (username),
  CONSTRAINT fk_credentials_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash    CHAR(64)        NOT NULL,
  account_type  ENUM('admin','contractor') NOT NULL,
  admin_id      BIGINT UNSIGNED NULL,
  contractor_id BIGINT UNSIGNED NULL,
  ip_address    VARCHAR(45)     NULL,
  user_agent    VARCHAR(255)    NULL,
  expires_at    DATETIME        NOT NULL,
  last_seen_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token_hash),
  KEY idx_sessions_admin (admin_id),
  KEY idx_sessions_contractor (contractor_id),
  KEY idx_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_admin      FOREIGN KEY (admin_id)      REFERENCES admins (id)      ON DELETE CASCADE,
  CONSTRAINT fk_sessions_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_type  ENUM('admin','contractor') NOT NULL,
  identifier    VARCHAR(190)    NOT NULL,
  admin_id      BIGINT UNSIGNED NULL,
  contractor_id BIGINT UNSIGNED NULL,
  ip_address    VARCHAR(45)     NULL,
  user_agent    VARCHAR(255)    NULL,
  success       TINYINT(1)      NOT NULL DEFAULT 0,
  reason        VARCHAR(60)     NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_identifier (account_type, identifier, created_at),
  KEY idx_login_ip (ip_address, created_at),
  KEY idx_login_contractor (contractor_id, created_at),
  KEY idx_login_admin (admin_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contractor_verifications (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_id BIGINT UNSIGNED NOT NULL,
  action        ENUM('submitted','verified','rejected','activated','suspended','reactivated','deactivated','password_reset') NOT NULL,
  note          VARCHAR(500)    NULL,
  admin_id      BIGINT UNSIGNED NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_verifications_contractor (contractor_id, created_at),
  CONSTRAINT fk_verifications_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE,
  CONSTRAINT fk_verifications_admin      FOREIGN KEY (admin_id)      REFERENCES admins (id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Reward configuration
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(40)  NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_token_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gift_catalogue (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  gift_code           VARCHAR(60)     NOT NULL,
  name                VARCHAR(150)    NOT NULL,
  category            VARCHAR(80)     NULL,
  description         TEXT            NULL,
  image_url           VARCHAR(500)    NULL,
  required_points     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  required_tokens     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  display_value       DECIMAL(12,2)   NULL,
  eligibility_note    VARCHAR(255)    NULL,
  terms               TEXT            NULL,
  is_visible          TINYINT(1)      NOT NULL DEFAULT 1,
  is_featured         TINYINT(1)      NOT NULL DEFAULT 0,
  redemption_enabled  TINYINT(1)      NOT NULL DEFAULT 1,
  display_order       INT             NOT NULL DEFAULT 0,
  status              ENUM('active','inactive','archived') NOT NULL DEFAULT 'active',
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_gift_code (gift_code),
  KEY idx_gift_listing (status, is_visible, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- total_quantity NULL = unlimited stock
CREATE TABLE IF NOT EXISTS gift_availability (
  gift_id             BIGINT UNSIGNED NOT NULL,
  total_quantity      INT UNSIGNED    NULL,
  reserved_quantity   INT UNSIGNED    NOT NULL DEFAULT 0,
  issued_quantity     INT UNSIGNED    NOT NULL DEFAULT 0,
  low_stock_threshold INT UNSIGNED    NOT NULL DEFAULT 3,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (gift_id),
  CONSTRAINT fk_gift_availability_gift FOREIGN KEY (gift_id) REFERENCES gift_catalogue (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_rules (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_code           VARCHAR(40)     NOT NULL,
  version             INT UNSIGNED    NOT NULL DEFAULT 1,
  parent_rule_id      BIGINT UNSIGNED NULL,
  name                VARCHAR(150)    NOT NULL,
  description         TEXT            NULL,
  rule_type           ENUM('quantity','purchase_value','brand','product','category','cumulative_target','milestone','campaign','direct_gift','manual_bonus') NOT NULL,
  product_category    VARCHAR(80)     NULL,
  brand               VARCHAR(80)     NULL,
  product_ref         VARCHAR(120)    NULL,
  min_quantity        DECIMAL(12,2)   NULL,
  min_amount          DECIMAL(12,2)   NULL,
  unit_size           DECIMAL(12,2)   NULL,
  reward_points       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  reward_tokens       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  token_category_id   INT UNSIGNED    NULL,
  target_threshold    DECIMAL(14,2)   NULL,
  gift_id             BIGINT UNSIGNED NULL,
  contractor_id       BIGINT UNSIGNED NULL,
  valid_from          DATE            NULL,
  valid_until         DATE            NULL,
  max_reward_cap      BIGINT UNSIGNED NULL,
  is_repeatable       TINYINT(1)      NOT NULL DEFAULT 1,
  is_stackable        TINYINT(1)      NOT NULL DEFAULT 0,
  priority            INT             NOT NULL DEFAULT 100,
  requires_approval   TINYINT(1)      NOT NULL DEFAULT 1,
  status              ENUM('draft','active','inactive','archived') NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rule_version (rule_code, version),
  KEY idx_rules_status (status, valid_from, valid_until),
  CONSTRAINT fk_rules_parent     FOREIGN KEY (parent_rule_id)      REFERENCES reward_rules (id)     ON DELETE SET NULL,
  CONSTRAINT fk_rules_token_cat  FOREIGN KEY (token_category_id)   REFERENCES token_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_rules_gift       FOREIGN KEY (gift_id)             REFERENCES gift_catalogue (id)   ON DELETE SET NULL,
  CONSTRAINT fk_rules_contractor FOREIGN KEY (contractor_id)       REFERENCES contractors (id)      ON DELETE CASCADE,
  CONSTRAINT fk_rules_admin      FOREIGN KEY (created_by_admin_id) REFERENCES admins (id)           ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_rule_conditions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  rule_id    BIGINT UNSIGNED NOT NULL,
  field      VARCHAR(60)     NOT NULL,
  operator   ENUM('eq','neq','gt','gte','lt','lte','in','between') NOT NULL,
  value      VARCHAR(255)    NOT NULL,
  PRIMARY KEY (id),
  KEY idx_conditions_rule (rule_id),
  CONSTRAINT fk_conditions_rule FOREIGN KEY (rule_id) REFERENCES reward_rules (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Activities (referred sales / purchases) and the reward ledger
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reward_activities (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  activity_code       VARCHAR(30)     NULL,
  contractor_id       BIGINT UNSIGNED NOT NULL,
  customer_name       VARCHAR(150)    NULL,
  reference_number    VARCHAR(80)     NOT NULL,
  activity_date       DATE            NOT NULL,
  product_category    VARCHAR(80)     NULL,
  product_ref         VARCHAR(150)    NULL,
  brand               VARCHAR(80)     NULL,
  quantity            DECIMAL(12,2)   NOT NULL DEFAULT 0,
  unit                VARCHAR(30)     NULL,
  eligible_amount     DECIMAL(12,2)   NOT NULL DEFAULT 0,
  document_url        VARCHAR(500)    NULL,
  notes               TEXT            NULL,
  status              ENUM('draft','submitted','approved','rejected','reversed') NOT NULL DEFAULT 'submitted',
  rejection_reason    VARCHAR(255)    NULL,
  approved_by_admin_id BIGINT UNSIGNED NULL,
  approved_at         DATETIME        NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_activity_code (activity_code),
  UNIQUE KEY uq_activity_reference (contractor_id, reference_number),
  KEY idx_activities_status_date (status, activity_date),
  KEY idx_activities_contractor_date (contractor_id, activity_date),
  CONSTRAINT fk_activities_contractor FOREIGN KEY (contractor_id)        REFERENCES contractors (id) ON DELETE RESTRICT,
  CONSTRAINT fk_activities_approver   FOREIGN KEY (approved_by_admin_id) REFERENCES admins (id)      ON DELETE SET NULL,
  CONSTRAINT fk_activities_creator    FOREIGN KEY (created_by_admin_id)  REFERENCES admins (id)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redemption_requests (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  claim_code            VARCHAR(30)     NULL,
  contractor_id         BIGINT UNSIGNED NOT NULL,
  gift_id               BIGINT UNSIGNED NOT NULL,
  gift_name             VARCHAR(150)    NOT NULL,
  required_points       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  required_tokens       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status                ENUM('requested','under_review','approved','rejected','ready_for_handover','delivered','completed','cancelled') NOT NULL DEFAULT 'requested',
  idempotency_key       VARCHAR(64)     NOT NULL,
  rejection_reason      VARCHAR(255)    NULL,
  internal_note         VARCHAR(500)    NULL,
  handover_reference    VARCHAR(120)    NULL,
  proof_url             VARCHAR(500)    NULL,
  reviewed_by_admin_id  BIGINT UNSIGNED NULL,
  reviewed_at           DATETIME        NULL,
  delivered_at          DATETIME        NULL,
  completed_at          DATETIME        NULL,
  cancelled_at          DATETIME        NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Only one open claim per contractor per gift.
  active_claim_key      VARCHAR(50) AS (
    CASE WHEN status IN ('requested','under_review','approved','ready_for_handover')
         THEN CONCAT(contractor_id, ':', gift_id) ELSE NULL END
  ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_redemption_code (claim_code),
  UNIQUE KEY uq_redemption_idempotency (idempotency_key),
  UNIQUE KEY uq_redemption_active (active_claim_key),
  KEY idx_redemptions_status (status, created_at),
  KEY idx_redemptions_contractor (contractor_id, created_at),
  CONSTRAINT fk_redemptions_contractor FOREIGN KEY (contractor_id)        REFERENCES contractors (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_redemptions_gift       FOREIGN KEY (gift_id)              REFERENCES gift_catalogue (id) ON DELETE RESTRICT,
  CONSTRAINT fk_redemptions_reviewer   FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins (id)         ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS redemption_status_history (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  redemption_id BIGINT UNSIGNED NOT NULL,
  from_status   VARCHAR(30)     NULL,
  to_status     VARCHAR(30)     NOT NULL,
  note          VARCHAR(500)    NULL,
  actor_type    ENUM('admin','contractor','system') NOT NULL,
  actor_id      BIGINT UNSIGNED NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_redemption_history (redemption_id, created_at),
  CONSTRAINT fk_redemption_history FOREIGN KEY (redemption_id) REFERENCES redemption_requests (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Append-only ledger. `amount` is always positive; entry_type defines the effect:
--   earn_pending   pending   += amount
--   pending_confirm pending  -= amount, available += amount, total_earned += amount
--   pending_cancel pending   -= amount
--   earn           available += amount, total_earned += amount
--   manual_credit  available += amount, total_earned += amount
--   manual_debit   available -= amount
--   reserve        available -= amount, reserved += amount
--   release        reserved  -= amount, available += amount
--   redeem         reserved  -= amount, redeemed += amount
--   reversal       available -= amount, reversed += amount
--   expiry         available -= amount, expired += amount
CREATE TABLE IF NOT EXISTS reward_transactions (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  txn_code            VARCHAR(30)     NULL,
  contractor_id       BIGINT UNSIGNED NOT NULL,
  currency            ENUM('points','tokens') NOT NULL,
  token_category_id   INT UNSIGNED    NULL,
  entry_type          ENUM('earn_pending','pending_confirm','pending_cancel','earn','manual_credit','manual_debit','reserve','release','redeem','reversal','expiry') NOT NULL,
  amount              BIGINT UNSIGNED NOT NULL,
  available_after     BIGINT          NOT NULL,
  idempotency_key     VARCHAR(80)     NOT NULL,
  reason              VARCHAR(255)    NULL,
  activity_id         BIGINT UNSIGNED NULL,
  redemption_id       BIGINT UNSIGNED NULL,
  rule_id             BIGINT UNSIGNED NULL,
  reverses_txn_id     BIGINT UNSIGNED NULL,
  created_by_type     ENUM('admin','contractor','system') NOT NULL,
  created_by_id       BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_txn_code (txn_code),
  UNIQUE KEY uq_txn_idempotency (idempotency_key),
  KEY idx_txn_contractor (contractor_id, created_at),
  KEY idx_txn_type_date (entry_type, created_at),
  KEY idx_txn_redemption (redemption_id),
  KEY idx_txn_activity (activity_id),
  CONSTRAINT chk_txn_amount CHECK (amount > 0),
  CONSTRAINT fk_txn_contractor FOREIGN KEY (contractor_id)     REFERENCES contractors (id)         ON DELETE RESTRICT,
  CONSTRAINT fk_txn_token_cat  FOREIGN KEY (token_category_id) REFERENCES token_categories (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_txn_activity   FOREIGN KEY (activity_id)       REFERENCES reward_activities (id)   ON DELETE RESTRICT,
  CONSTRAINT fk_txn_redemption FOREIGN KEY (redemption_id)     REFERENCES redemption_requests (id) ON DELETE RESTRICT,
  CONSTRAINT fk_txn_rule       FOREIGN KEY (rule_id)           REFERENCES reward_rules (id)        ON DELETE RESTRICT,
  CONSTRAINT fk_txn_reverses   FOREIGN KEY (reverses_txn_id)   REFERENCES reward_transactions (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- token_category_id = 0 for points (no category).
CREATE TABLE IF NOT EXISTS reward_balances (
  contractor_id     BIGINT UNSIGNED NOT NULL,
  currency          ENUM('points','tokens') NOT NULL,
  token_category_id INT UNSIGNED    NOT NULL DEFAULT 0,
  pending           BIGINT          NOT NULL DEFAULT 0,
  available         BIGINT          NOT NULL DEFAULT 0,
  reserved          BIGINT          NOT NULL DEFAULT 0,
  redeemed          BIGINT          NOT NULL DEFAULT 0,
  reversed          BIGINT          NOT NULL DEFAULT 0,
  expired           BIGINT          NOT NULL DEFAULT 0,
  total_earned      BIGINT          NOT NULL DEFAULT 0,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (contractor_id, currency, token_category_id),
  CONSTRAINT chk_balance_non_negative CHECK (pending >= 0 AND available >= 0 AND reserved >= 0),
  CONSTRAINT fk_balances_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Offers, targets, notifications, catalogue, configuration, audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  offer_code          VARCHAR(30)     NULL,
  title               VARCHAR(150)    NOT NULL,
  description         TEXT            NULL,
  banner_url          VARCHAR(500)    NULL,
  audience            ENUM('all','specific') NOT NULL DEFAULT 'all',
  start_date          DATE            NOT NULL,
  end_date            DATE            NOT NULL,
  reward_type         ENUM('points','tokens','gift','multiplier','info') NOT NULL DEFAULT 'info',
  target_value        DECIMAL(14,2)   NULL,
  target_unit         ENUM('points','tokens','amount','quantity') NULL,
  reward_value        BIGINT UNSIGNED NULL,
  multiplier          DECIMAL(4,2)    NULL,
  show_progress       TINYINT(1)      NOT NULL DEFAULT 0,
  is_featured         TINYINT(1)      NOT NULL DEFAULT 0,
  terms               TEXT            NULL,
  status              ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_offer_code (offer_code),
  KEY idx_offers_live (status, start_date, end_date),
  CONSTRAINT fk_offers_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS offer_contractors (
  offer_id      BIGINT UNSIGNED NOT NULL,
  contractor_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (offer_id, contractor_id),
  CONSTRAINT fk_offer_contractors_offer      FOREIGN KEY (offer_id)      REFERENCES offers (id)      ON DELETE CASCADE,
  CONSTRAINT fk_offer_contractors_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contractor_targets (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_id BIGINT UNSIGNED NOT NULL,
  offer_id      BIGINT UNSIGNED NULL,
  rule_id       BIGINT UNSIGNED NULL,
  title         VARCHAR(150)    NOT NULL,
  target_value  DECIMAL(14,2)   NOT NULL,
  current_value DECIMAL(14,2)   NOT NULL DEFAULT 0,
  unit          ENUM('points','tokens','amount','quantity') NOT NULL,
  status        ENUM('in_progress','achieved','expired') NOT NULL DEFAULT 'in_progress',
  achieved_at   DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_targets_contractor (contractor_id, status),
  CONSTRAINT fk_targets_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id)  ON DELETE CASCADE,
  CONSTRAINT fk_targets_offer      FOREIGN KEY (offer_id)      REFERENCES offers (id)       ON DELETE SET NULL,
  CONSTRAINT fk_targets_rule       FOREIGN KEY (rule_id)       REFERENCES reward_rules (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store-maintained account statement (Udhar / Advance) shown on the contractor's My Ledger screen.
CREATE TABLE IF NOT EXISTS contractor_account_entries (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  contractor_id       BIGINT UNSIGNED NOT NULL,
  entry_type          ENUM('opening','credit','debit','udhar','advance') NOT NULL,
  amount              DECIMAL(14,2)   NOT NULL,
  description         VARCHAR(200)    NOT NULL,
  reference           VARCHAR(80)     NULL,
  entry_date          DATE            NOT NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_account_entries_contractor (contractor_id, entry_date),
  CONSTRAINT fk_account_entries_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE,
  CONSTRAINT fk_account_entries_admin FOREIGN KEY (created_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind                ENUM('reward','sale','offer','system') NOT NULL DEFAULT 'system',
  event_type          VARCHAR(60)     NOT NULL,
  title               VARCHAR(150)    NOT NULL,
  body                VARCHAR(500)    NOT NULL,
  created_by_type     ENUM('admin','system') NOT NULL DEFAULT 'system',
  created_by_id       BIGINT UNSIGNED NULL,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_recipients (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  notification_id BIGINT UNSIGNED NOT NULL,
  contractor_id   BIGINT UNSIGNED NOT NULL,
  read_at         DATETIME        NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_recipient (notification_id, contractor_id),
  KEY idx_recipient_inbox (contractor_id, read_at, created_at),
  CONSTRAINT fk_recipients_notification FOREIGN KEY (notification_id) REFERENCES notifications (id) ON DELETE CASCADE,
  CONSTRAINT fk_recipients_contractor   FOREIGN KEY (contractor_id)   REFERENCES contractors (id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contractor_notification_preferences (
  contractor_id BIGINT UNSIGNED NOT NULL,
  rewards       TINYINT(1) NOT NULL DEFAULT 1,
  sales         TINYINT(1) NOT NULL DEFAULT 1,
  offers        TINYINT(1) NOT NULL DEFAULT 1,
  sms           TINYINT(1) NOT NULL DEFAULT 0,
  updated_at    DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (contractor_id),
  CONSTRAINT fk_preferences_contractor FOREIGN KEY (contractor_id) REFERENCES contractors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug          VARCHAR(40)  NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  image_url     VARCHAR(500) NULL,
  display_order INT          NOT NULL DEFAULT 0,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_category_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id   INT UNSIGNED    NOT NULL,
  name          VARCHAR(150)    NOT NULL,
  brand         VARCHAR(80)     NULL,
  unit          VARCHAR(60)     NULL,
  scheme_label  VARCHAR(80)     NULL,
  image_url     VARCHAR(500)    NULL,
  display_order INT             NOT NULL DEFAULT 0,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category (category_id, status, display_order),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contractor_app_configuration (
  config_key          VARCHAR(80)  NOT NULL,
  config_value        TEXT         NOT NULL,
  updated_by_admin_id BIGINT UNSIGNED NULL,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key),
  CONSTRAINT fk_config_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admins (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_files (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  media_key            CHAR(32)        NOT NULL UNIQUE,
  mime_type            VARCHAR(50)     NOT NULL,
  size_bytes           INT UNSIGNED    NOT NULL,
  original_name        VARCHAR(255)    NULL,
  data                 MEDIUMBLOB      NOT NULL,
  uploaded_by_admin_id BIGINT UNSIGNED NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_type  ENUM('admin','contractor','system') NOT NULL,
  actor_id    BIGINT UNSIGNED NULL,
  action      VARCHAR(80)     NOT NULL,
  entity_type VARCHAR(60)     NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  summary     VARCHAR(255)    NULL,
  metadata    TEXT            NULL,
  ip_address  VARCHAR(45)     NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id, created_at),
  KEY idx_audit_actor (actor_type, actor_id, created_at),
  KEY idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Reference data (safe to re-run)
-- =============================================================================
INSERT IGNORE INTO token_categories (code, name, description) VALUES
  ('general', 'General Tokens', 'Default token category used for targets and milestone schemes');

INSERT IGNORE INTO gift_catalogue (gift_code, name, category, description, image_url, required_points, display_order) VALUES
  ('glue-mixer',      'Glue Mixer',      'Tools',       '1400W heavy-duty paddle mixer for tile adhesive, grout and putty. Variable speed with steel paddle.', '/images/gifts/glue-mixer.png',       3500, 1),
  ('mobile-phone',    'Mobile Phone',    'Electronics', '6.6" Android smartphone with 128GB storage, 50MP camera and 5000mAh battery.',                       '/images/gifts/mobile-phone.png',    12000, 2),
  ('led-tv',          'LED TV',          'Electronics', '43" Full HD smart LED TV with built-in apps and two HDMI ports.',                                     '/images/gifts/led-tv.png',          25000, 3),
  ('washing-machine', 'Washing Machine', 'Appliances',  '7kg fully-automatic front load washing machine with quick wash.',                                      '/images/gifts/washing-machine.png', 28000, 4),
  ('refrigerator',    'Refrigerator',    'Appliances',  '260L frost-free double door refrigerator with inverter compressor.',                                  '/images/gifts/refrigerator.png',    32000, 5),
  ('motorcycle',      'Motorcycle',      'Vehicles',    '125cc commuter motorcycle with disc brake. Registration charges extra.',                              '/images/gifts/motorcycle.png',      85000, 6);

-- Stock is unlimited (NULL) until the store sets real quantities in the admin panel.
INSERT IGNORE INTO gift_availability (gift_id, total_quantity)
  SELECT id, NULL FROM gift_catalogue;

INSERT IGNORE INTO product_categories (slug, name, image_url, display_order) VALUES
  ('tiles',    'Tiles',                '/images/products/tiles.png',    1),
  ('sanitary', 'Sanitary',             '/images/products/sanitary.png', 2),
  ('adhesive', 'Tile Adhesive / Glue', '/images/products/adhesive.png', 3),
  ('marble',   'Marble',               '/images/products/marble.png',   4),
  ('stone',    'Stone',                '/images/products/stone.png',    5),
  ('other',    'Other Products',       '/images/products/other.png',    6);

INSERT INTO products (category_id, name, brand, unit, display_order)
SELECT c.id, p.name, p.brand, p.unit, p.ord
FROM (
  SELECT 'tiles' AS slug, 'Vitrified Floor Tile 600x600' AS name, 'Kajaria' AS brand, 'per box (4 pcs)' AS unit, 1 AS ord UNION ALL
  SELECT 'tiles',    'Glossy Wall Tile 300x450',  'Somany',          'per box (6 pcs)', 2 UNION ALL
  SELECT 'sanitary', 'Wall-hung WC with Seat',    'Jaquar',          'per piece',       1 UNION ALL
  SELECT 'sanitary', 'Table-top Wash Basin',      'Cera',            'per piece',       2 UNION ALL
  SELECT 'adhesive', 'Tile Adhesive Type 1',      'MYK Laticrete',   'per 20 kg bag',   1 UNION ALL
  SELECT 'adhesive', 'Stone & Tile Adhesive',     'Roff',            'per 20 kg bag',   2 UNION ALL
  SELECT 'marble',   'Makrana White Marble',      'Rajdhani Select', 'per sq. ft.',     1 UNION ALL
  SELECT 'marble',   'Italian Statuario Marble',  'Rajdhani Select', 'per sq. ft.',     2 UNION ALL
  SELECT 'stone',    'Kota Stone Natural',        'Rajdhani Select', 'per sq. ft.',     1 UNION ALL
  SELECT 'stone',    'Jaisalmer Yellow Stone',    'Rajdhani Select', 'per sq. ft.',     2 UNION ALL
  SELECT 'other',    'Epoxy Tile Grout',          'MYK Laticrete',   'per 1 kg tub',    1 UNION ALL
  SELECT 'other',    'Tile Spacers 3mm',          'Generic',         'per pack (200)',  2
) p
JOIN product_categories c ON c.slug = p.slug
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

INSERT IGNORE INTO contractor_app_configuration (config_key, config_value) VALUES
  ('store_phone',     '+911412345678'),
  ('store_whatsapp',  '911412345678'),
  ('ledger_enabled',  'false'),
  ('support_message', 'For password resets or account changes, contact Rajdhani Connects.'),
  ('activity_approval_mode', 'manual'),
  ('points_expiry_days', '0');
