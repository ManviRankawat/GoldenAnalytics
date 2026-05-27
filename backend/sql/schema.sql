-- GoldenAnalytics: Vendor Payments Schema
-- Run: psql -d golden_analytics -f schema.sql

CREATE TABLE IF NOT EXISTS vendor_payments (
  id           SERIAL PRIMARY KEY,
  bien         VARCHAR(20),
  fy           SMALLINT        NOT NULL,
  f_month      SMALLINT        NOT NULL,
  agy          VARCHAR(20)     NOT NULL,
  agency       VARCHAR(200)    NOT NULL,
  object       VARCHAR(5),
  category     VARCHAR(100),
  subobj       VARCHAR(10),
  sub_category VARCHAR(200),
  vendor       VARCHAR(350)    NOT NULL,
  amount       NUMERIC(18, 2)  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vp_fy           ON vendor_payments(fy);
CREATE INDEX IF NOT EXISTS idx_vp_f_month      ON vendor_payments(f_month);
CREATE INDEX IF NOT EXISTS idx_vp_agency       ON vendor_payments(agency);
CREATE INDEX IF NOT EXISTS idx_vp_category     ON vendor_payments(category);
CREATE INDEX IF NOT EXISTS idx_vp_sub_category ON vendor_payments(sub_category);
CREATE INDEX IF NOT EXISTS idx_vp_vendor       ON vendor_payments(vendor);
CREATE INDEX IF NOT EXISTS idx_vp_object       ON vendor_payments(object);
CREATE INDEX IF NOT EXISTS idx_vp_amount       ON vendor_payments(amount);
CREATE INDEX IF NOT EXISTS idx_vp_fy_month     ON vendor_payments(fy, f_month);
CREATE INDEX IF NOT EXISTS idx_vp_fy_agency    ON vendor_payments(fy, agency);
CREATE INDEX IF NOT EXISTS idx_vp_fy_category  ON vendor_payments(fy, category);
