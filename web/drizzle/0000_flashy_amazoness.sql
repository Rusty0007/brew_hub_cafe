-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "brewhub";
--> statement-breakpoint
CREATE TABLE "brewhub"."users" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"username" varchar(80) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brewhub"."roles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(40) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "brewhub"."branches" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."branches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"code" varchar(20) NOT NULL,
	"name" varchar(120) NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "brewhub"."categories" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brewhub"."products" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"category_id" bigint,
	"sku" varchar(60) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"base_price" numeric(12, 2) NOT NULL,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_key" UNIQUE("sku"),
	CONSTRAINT "products_base_price_check" CHECK (base_price >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "brewhub"."orders" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_no" varchar(40) NOT NULL,
	"branch_id" bigint NOT NULL,
	"customer_id" bigint,
	"created_by_user_id" bigint NOT NULL,
	"status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) GENERATED ALWAYS AS (GREATEST(round(((subtotal - discount_amount) + tax_amount), 2), (0)::numeric)) STORED,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	CONSTRAINT "orders_order_no_key" UNIQUE("order_no"),
	CONSTRAINT "orders_subtotal_check" CHECK (subtotal >= (0)::numeric),
	CONSTRAINT "orders_discount_amount_check" CHECK (discount_amount >= (0)::numeric),
	CONSTRAINT "orders_tax_amount_check" CHECK (tax_amount >= (0)::numeric),
	CONSTRAINT "orders_version_check" CHECK (version > 0)
);
--> statement-breakpoint
CREATE TABLE "brewhub"."customers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."customers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"customer_no" varchar(30),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_customer_no_key" UNIQUE("customer_no"),
	CONSTRAINT "ck_customer_has_identity" CHECK ((first_name IS NOT NULL) OR (last_name IS NOT NULL) OR (email IS NOT NULL) OR (phone IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "brewhub"."order_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"sku_snapshot" varchar(60) NOT NULL,
	"product_name_snapshot" varchar(160) NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) GENERATED ALWAYS AS (GREATEST(round(((quantity * unit_price) - discount_amount), 2), (0)::numeric)) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK (quantity > (0)::numeric),
	CONSTRAINT "order_items_unit_price_check" CHECK (unit_price >= (0)::numeric),
	CONSTRAINT "order_items_discount_amount_check" CHECK (discount_amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "brewhub"."payments" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"transaction_type" varchar(20) DEFAULT 'PAYMENT' NOT NULL,
	"parent_payment_id" bigint,
	"method" varchar(40) NOT NULL,
	"provider" varchar(80),
	"provider_reference" varchar(160),
	"amount" numeric(14, 2) NOT NULL,
	"status" varchar(32) NOT NULL,
	"failure_code" varchar(80),
	"failure_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "payments_transaction_type_check" CHECK ((transaction_type)::text = ANY ((ARRAY['PAYMENT'::character varying, 'REFUND'::character varying])::text[])),
	CONSTRAINT "payments_amount_check" CHECK (amount > (0)::numeric),
	CONSTRAINT "ck_refund_has_parent" CHECK ((((transaction_type)::text = 'PAYMENT'::text) AND (parent_payment_id IS NULL)) OR (((transaction_type)::text = 'REFUND'::text) AND (parent_payment_id IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "brewhub"."inventory" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."inventory_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"branch_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"on_hand_qty" numeric(14, 3) DEFAULT '0' NOT NULL,
	"reserved_qty" numeric(14, 3) DEFAULT '0' NOT NULL,
	"available_qty" numeric(14, 3) GENERATED ALWAYS AS ((on_hand_qty - reserved_qty)) STORED,
	"reorder_level" numeric(14, 3) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_inventory_branch_product" UNIQUE("branch_id","product_id"),
	CONSTRAINT "inventory_on_hand_qty_check" CHECK (on_hand_qty >= (0)::numeric),
	CONSTRAINT "inventory_reserved_qty_check" CHECK (reserved_qty >= (0)::numeric),
	CONSTRAINT "inventory_reorder_level_check" CHECK (reorder_level >= (0)::numeric),
	CONSTRAINT "inventory_version_check" CHECK (version > 0),
	CONSTRAINT "ck_inventory_reserved_not_over_on_hand" CHECK (reserved_qty <= on_hand_qty)
);
--> statement-breakpoint
CREATE TABLE "brewhub"."inventory_reservations" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."inventory_reservations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" bigint NOT NULL,
	"branch_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_check" CHECK (quantity > (0)::numeric),
	CONSTRAINT "inventory_reservations_status_check" CHECK ((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CONSUMED'::character varying, 'RELEASED'::character varying, 'EXPIRED'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "brewhub"."stock_movements" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"branch_id" bigint NOT NULL,
	"product_id" bigint NOT NULL,
	"order_id" bigint,
	"reservation_id" bigint,
	"movement_type" varchar(30) NOT NULL,
	"on_hand_delta" numeric(14, 3) DEFAULT '0' NOT NULL,
	"reserved_delta" numeric(14, 3) DEFAULT '0' NOT NULL,
	"on_hand_after" numeric(14, 3) NOT NULL,
	"reserved_after" numeric(14, 3) NOT NULL,
	"reference" varchar(160),
	"reason" text,
	"created_by_user_id" bigint,
	"trace_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_on_hand_after_check" CHECK (on_hand_after >= (0)::numeric),
	CONSTRAINT "stock_movements_reserved_after_check" CHECK (reserved_after >= (0)::numeric),
	CONSTRAINT "ck_stock_movement_nonzero" CHECK ((on_hand_delta <> (0)::numeric) OR (reserved_delta <> (0)::numeric)),
	CONSTRAINT "ck_stock_movement_valid_balance" CHECK (reserved_after <= on_hand_after)
);
--> statement-breakpoint
CREATE TABLE "brewhub"."idempotency_keys" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."idempotency_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"branch_id" bigint,
	"user_id" bigint,
	"idempotency_key" varchar(160) NOT NULL,
	"operation" varchar(80) NOT NULL,
	"request_hash" char(64) NOT NULL,
	"status" varchar(20) DEFAULT 'PROCESSING' NOT NULL,
	"result_reference" varchar(160),
	"response_code" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "uq_idempotency_operation_key" UNIQUE("idempotency_key","operation"),
	CONSTRAINT "idempotency_keys_status_check" CHECK ((status)::text = ANY ((ARRAY['PROCESSING'::character varying, 'SUCCEEDED'::character varying, 'FAILED'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "brewhub"."audit_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "brewhub"."audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" bigint,
	"branch_id" bigint,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(80) NOT NULL,
	"resource_id" varchar(160),
	"before_data" jsonb,
	"after_data" jsonb,
	"reason" text,
	"request_id" varchar(100),
	"trace_id" varchar(100),
	"source_ip" "inet"
);
--> statement-breakpoint
CREATE TABLE "brewhub"."user_roles" (
	"user_id" bigint NOT NULL,
	"role_id" bigint NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "brewhub"."user_branches" (
	"user_id" bigint NOT NULL,
	"branch_id" bigint NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_branches_pkey" PRIMARY KEY("user_id","branch_id")
);
--> statement-breakpoint
ALTER TABLE "brewhub"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "brewhub"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "brewhub"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."orders" ADD CONSTRAINT "orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "brewhub"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "brewhub"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "brewhub"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "brewhub"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."payments" ADD CONSTRAINT "payments_parent_payment_id_fkey" FOREIGN KEY ("parent_payment_id") REFERENCES "brewhub"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."inventory" ADD CONSTRAINT "inventory_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "brewhub"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."inventory_reservations" ADD CONSTRAINT "inventory_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "brewhub"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."inventory_reservations" ADD CONSTRAINT "inventory_reservations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "brewhub"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."stock_movements" ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "brewhub"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "brewhub"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."stock_movements" ADD CONSTRAINT "stock_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "brewhub"."inventory_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "brewhub"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "brewhub"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "brewhub"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."audit_logs" ADD CONSTRAINT "audit_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "brewhub"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "brewhub"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."user_branches" ADD CONSTRAINT "user_branches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "brewhub"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewhub"."user_branches" ADD CONSTRAINT "user_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "brewhub"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email_lower" ON "brewhub"."users" USING btree (lower((email)::text) text_ops) WHERE (email IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_username_lower" ON "brewhub"."users" USING btree (lower((username)::text) text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_name_lower" ON "brewhub"."categories" USING btree (lower((name)::text) text_ops);--> statement-breakpoint
CREATE INDEX "ix_products_active_name" ON "brewhub"."products" USING btree ("is_active" text_ops,"name" bool_ops);--> statement-breakpoint
CREATE INDEX "ix_products_category_id" ON "brewhub"."products" USING btree ("category_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_products_name_trgm" ON "brewhub"."products" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_products_sku_trgm" ON "brewhub"."products" USING gin ("sku" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "ix_orders_branch_created" ON "brewhub"."orders" USING btree ("branch_id" int8_ops,"created_at" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_orders_customer_created" ON "brewhub"."orders" USING btree ("customer_id" int8_ops,"created_at" timestamptz_ops) WHERE (customer_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "ix_orders_status_created" ON "brewhub"."orders" USING btree ("status" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_customers_email_lower" ON "brewhub"."customers" USING btree (lower((email)::text) text_ops);--> statement-breakpoint
CREATE INDEX "ix_customers_name" ON "brewhub"."customers" USING btree (lower((last_name)::text) text_ops,lower((first_name)::text) text_ops);--> statement-breakpoint
CREATE INDEX "ix_customers_phone" ON "brewhub"."customers" USING btree ("phone" text_ops);--> statement-breakpoint
CREATE INDEX "ix_order_items_order_id" ON "brewhub"."order_items" USING btree ("order_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_order_items_product_id" ON "brewhub"."order_items" USING btree ("product_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_payments_order_status" ON "brewhub"."payments" USING btree ("order_id" int8_ops,"status" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_payments_parent_payment" ON "brewhub"."payments" USING btree ("parent_payment_id" int8_ops) WHERE (parent_payment_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_payments_provider_reference" ON "brewhub"."payments" USING btree ("provider" text_ops,"provider_reference" text_ops) WHERE ((provider IS NOT NULL) AND (provider_reference IS NOT NULL));--> statement-breakpoint
CREATE INDEX "ix_inventory_low_stock" ON "brewhub"."inventory" USING btree ("branch_id" numeric_ops,"available_qty" int8_ops,"reorder_level" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_inventory_product_id" ON "brewhub"."inventory" USING btree ("product_id" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_reservations_active_expiry" ON "brewhub"."inventory_reservations" USING btree ("expires_at" timestamptz_ops) WHERE ((status)::text = 'ACTIVE'::text);--> statement-breakpoint
CREATE INDEX "ix_reservations_product_status" ON "brewhub"."inventory_reservations" USING btree ("branch_id" text_ops,"product_id" int8_ops,"status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_active_reservation_order_product" ON "brewhub"."inventory_reservations" USING btree ("order_id" int8_ops,"product_id" int8_ops) WHERE ((status)::text = 'ACTIVE'::text);--> statement-breakpoint
CREATE INDEX "ix_stock_movements_order_id" ON "brewhub"."stock_movements" USING btree ("order_id" int8_ops) WHERE (order_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "ix_stock_movements_product_time" ON "brewhub"."stock_movements" USING btree ("branch_id" int8_ops,"product_id" int8_ops,"created_at" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_stock_movements_trace_id" ON "brewhub"."stock_movements" USING btree ("trace_id" text_ops) WHERE (trace_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "ix_idempotency_branch_user" ON "brewhub"."idempotency_keys" USING btree ("branch_id" timestamptz_ops,"user_id" int8_ops,"created_at" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_idempotency_expiry" ON "brewhub"."idempotency_keys" USING btree ("expires_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_audit_actor_time" ON "brewhub"."audit_logs" USING btree ("actor_user_id" int8_ops,"occurred_at" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_audit_resource_time" ON "brewhub"."audit_logs" USING btree ("resource_type" text_ops,"resource_id" timestamptz_ops,"occurred_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_audit_trace_id" ON "brewhub"."audit_logs" USING btree ("trace_id" text_ops) WHERE (trace_id IS NOT NULL);
*/