-- ============================================================
-- P5-1: user_id INTEGER/STRING → UUID 数据库模式迁移
-- 说明: 所有数据表 user_id 从 INT/VARCHAR 迁移为 UUID
--       以匹配 users.id (UUID)。
-- 注意: 旧 user_id 为 INT/STR，与 UUID 的 users.id 无法映射，
--       历史数据 user_id 将置为 NULL（dev 环境可接受）。
-- 执行: psql -U xone -d xone -f p5_1_user_id_to_uuid.sql
-- ============================================================

BEGIN;

-- ─── 个人模式表 ──────────────────────────────────────────

-- health_food_records
ALTER TABLE health_food_records DROP CONSTRAINT IF EXISTS health_food_records_user_id_fkey;
ALTER TABLE health_food_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE health_food_records ADD COLUMN user_id UUID,
    ADD CONSTRAINT health_food_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_health_food_user ON health_food_records(user_id);

-- health_exercise_records
ALTER TABLE health_exercise_records DROP CONSTRAINT IF EXISTS health_exercise_records_user_id_fkey;
ALTER TABLE health_exercise_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE health_exercise_records ADD COLUMN user_id UUID,
    ADD CONSTRAINT health_exercise_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_health_exercise_user ON health_exercise_records(user_id);

-- health_sleep_records
ALTER TABLE health_sleep_records DROP CONSTRAINT IF EXISTS health_sleep_records_user_id_fkey;
ALTER TABLE health_sleep_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE health_sleep_records ADD COLUMN user_id UUID,
    ADD CONSTRAINT health_sleep_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_health_sleep_user ON health_sleep_records(user_id);

-- reading_notes
ALTER TABLE reading_notes DROP CONSTRAINT IF EXISTS reading_notes_user_id_fkey;
ALTER TABLE reading_notes DROP COLUMN IF EXISTS user_id;
ALTER TABLE reading_notes ADD COLUMN user_id UUID,
    ADD CONSTRAINT reading_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_reading_user ON reading_notes(user_id);

-- media_watch_records
ALTER TABLE media_watch_records DROP CONSTRAINT IF EXISTS media_watch_records_user_id_fkey;
ALTER TABLE media_watch_records DROP COLUMN IF EXISTS user_id;
ALTER TABLE media_watch_records ADD COLUMN user_id UUID,
    ADD CONSTRAINT media_watch_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_media_user ON media_watch_records(user_id);

-- shopping_items
ALTER TABLE shopping_items DROP CONSTRAINT IF EXISTS shopping_items_user_id_fkey;
ALTER TABLE shopping_items DROP COLUMN IF EXISTS user_id;
ALTER TABLE shopping_items ADD COLUMN user_id UUID,
    ADD CONSTRAINT shopping_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON shopping_items(user_id);

-- shopping_budgets
ALTER TABLE shopping_budgets DROP CONSTRAINT IF EXISTS shopping_budgets_user_id_fkey;
ALTER TABLE shopping_budgets DROP COLUMN IF EXISTS user_id;
ALTER TABLE shopping_budgets ADD COLUMN user_id UUID,
    ADD CONSTRAINT shopping_budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_shopping_budgets_user ON shopping_budgets(user_id);

-- asset_accounts
ALTER TABLE asset_accounts DROP CONSTRAINT IF EXISTS asset_accounts_user_id_fkey;
ALTER TABLE asset_accounts DROP COLUMN IF EXISTS user_id;
ALTER TABLE asset_accounts ADD COLUMN user_id UUID,
    ADD CONSTRAINT asset_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_asset_accounts_user ON asset_accounts(user_id);

-- asset_transactions
ALTER TABLE asset_transactions DROP CONSTRAINT IF EXISTS asset_transactions_user_id_fkey;
ALTER TABLE asset_transactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE asset_transactions ADD COLUMN user_id UUID,
    ADD CONSTRAINT asset_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_asset_transactions_user ON asset_transactions(user_id);

-- ─── 工作模式表 ──────────────────────────────────────────

-- contracts
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_user_id_fkey;
ALTER TABLE contracts DROP COLUMN IF EXISTS user_id;
ALTER TABLE contracts ADD COLUMN user_id UUID,
    ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts(user_id);

-- archives
ALTER TABLE archives DROP CONSTRAINT IF EXISTS archives_user_id_fkey;
ALTER TABLE archives DROP COLUMN IF EXISTS user_id;
ALTER TABLE archives ADD COLUMN user_id UUID,
    ADD CONSTRAINT archives_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_archives_user ON archives(user_id);

-- knowledge_documents
ALTER TABLE knowledge_documents DROP CONSTRAINT IF EXISTS knowledge_documents_user_id_fkey;
ALTER TABLE knowledge_documents DROP COLUMN IF EXISTS user_id;
ALTER TABLE knowledge_documents ADD COLUMN user_id UUID,
    ADD CONSTRAINT knowledge_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_user ON knowledge_documents(user_id);

-- knowledge_conversations
ALTER TABLE knowledge_conversations DROP CONSTRAINT IF EXISTS knowledge_conversations_user_id_fkey;
ALTER TABLE knowledge_conversations DROP COLUMN IF EXISTS user_id;
ALTER TABLE knowledge_conversations ADD COLUMN user_id UUID,
    ADD CONSTRAINT knowledge_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_knowledge_conv_user ON knowledge_conversations(user_id);

-- dispatch_tasks
ALTER TABLE dispatch_tasks DROP CONSTRAINT IF EXISTS dispatch_tasks_user_id_fkey;
ALTER TABLE dispatch_tasks DROP COLUMN IF EXISTS user_id;
ALTER TABLE dispatch_tasks ADD COLUMN user_id UUID,
    ADD CONSTRAINT dispatch_tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_dispatch_tasks_user ON dispatch_tasks(user_id);

-- dispatch_reports
ALTER TABLE dispatch_reports DROP CONSTRAINT IF EXISTS dispatch_reports_user_id_fkey;
ALTER TABLE dispatch_reports DROP COLUMN IF EXISTS user_id;
ALTER TABLE dispatch_reports ADD COLUMN user_id UUID,
    ADD CONSTRAINT dispatch_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_dispatch_reports_user ON dispatch_reports(user_id);

COMMIT;

-- 验证: 检查所有 user_id 列类型
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN (
    'health_food_records','health_exercise_records','health_sleep_records',
    'reading_notes','media_watch_records','shopping_items','shopping_budgets',
    'asset_accounts','asset_transactions',
    'contracts','archives',
    'knowledge_documents','knowledge_conversations',
    'dispatch_tasks','dispatch_reports'
  )
ORDER BY table_name;
