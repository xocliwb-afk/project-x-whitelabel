-- DropIndex
DROP INDEX "favorites_user_id_idx";

-- DropIndex
DROP INDEX "favorites_user_id_listing_id_key";

-- DropIndex
DROP INDEX "saved_searches_user_id_idx";

-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN "filters_hash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "favorites_user_id_tenant_id_created_at_idx" ON "favorites"("user_id", "tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_tenant_id_listing_id_key" ON "favorites"("user_id", "tenant_id", "listing_id");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_tenant_id_updated_at_idx" ON "saved_searches"("user_id", "tenant_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_user_id_tenant_id_filters_hash_key" ON "saved_searches"("user_id", "tenant_id", "filters_hash");
