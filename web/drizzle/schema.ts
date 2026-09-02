import { pgTable, pgSchema, uniqueIndex, bigint, varchar, text, boolean, timestamp, unique, index, foreignKey, check, numeric, integer, char, jsonb, inet, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const brewhub = pgSchema("brewhub");


export const usersInBrewhub = brewhub.table("users", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	username: varchar({ length: 80 }).notNull(),
	passwordHash: text("password_hash").notNull(),
	displayName: varchar("display_name", { length: 120 }).notNull(),
	email: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_users_email_lower").using("btree", sql`lower((email)::text)`).where(sql`(email IS NOT NULL)`),
	uniqueIndex("uq_users_username_lower").using("btree", sql`lower((username)::text)`),
]);

export const rolesInBrewhub = brewhub.table("roles", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "roles_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	code: varchar({ length: 40 }).notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_code_key").on(table.code),
]);

export const branchesInBrewhub = brewhub.table("branches", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "branches_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	code: varchar({ length: 20 }).notNull(),
	name: varchar({ length: 120 }).notNull(),
	timezone: varchar({ length: 64 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("branches_code_key").on(table.code),
]);

export const categoriesInBrewhub = brewhub.table("categories", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "categories_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar({ length: 120 }).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("uq_categories_name_lower").using("btree", sql`lower((name)::text)`),
]);

export const productsInBrewhub = brewhub.table("products", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "products_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	categoryId: bigint("category_id", { mode: "number" }),
	sku: varchar({ length: 60 }).notNull(),
	name: varchar({ length: 160 }).notNull(),
	description: text(),
	basePrice: numeric("base_price", { precision: 12, scale:  2 }).notNull(),
	trackInventory: boolean("track_inventory").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_products_active_name").using("btree", table.isActive.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("bool_ops")),
	index("ix_products_category_id").using("btree", table.categoryId.asc().nullsLast().op("int8_ops")),
	index("ix_products_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("ix_products_sku_trgm").using("gin", table.sku.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categoriesInBrewhub.id],
			name: "products_category_id_fkey"
		}).onDelete("set null"),
	unique("products_sku_key").on(table.sku),
	check("products_base_price_check", sql`base_price >= (0)::numeric`),
]);

export const customersInBrewhub = brewhub.table("customers", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "customers_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	customerNo: varchar("customer_no", { length: 30 }),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 40 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }),
}, (table) => [
	index("ix_customers_email_lower").using("btree", sql`lower((email)::text)`),
	index("ix_customers_name").using("btree", sql`lower((last_name)::text)`, sql`lower((first_name)::text)`),
	index("ix_customers_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInBrewhub.id],
			name: "fk_customers_user"
		}).onUpdate("cascade").onDelete("restrict"),
	unique("customers_customer_no_key").on(table.customerNo),
	unique("customers_user_id_key").on(table.userId),
	check("ck_customer_has_identity", sql`(first_name IS NOT NULL) OR (last_name IS NOT NULL) OR (email IS NOT NULL) OR (phone IS NOT NULL)`),
]);

export const orderItemsInBrewhub = brewhub.table("order_items", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "order_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	skuSnapshot: varchar("sku_snapshot", { length: 60 }).notNull(),
	productNameSnapshot: varchar("product_name_snapshot", { length: 160 }).notNull(),
	quantity: numeric({ precision: 12, scale:  3 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	discountAmount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	lineTotal: numeric("line_total", { precision: 14, scale:  2 }).generatedAlwaysAs(sql`GREATEST(round(((quantity * unit_price) - discount_amount), 2), (0)::numeric)`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_order_items_order_id").using("btree", table.orderId.asc().nullsLast().op("int8_ops")),
	index("ix_order_items_product_id").using("btree", table.productId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [ordersInBrewhub.id],
			name: "order_items_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBrewhub.id],
			name: "order_items_product_id_fkey"
		}).onDelete("restrict"),
	check("order_items_quantity_check", sql`quantity > (0)::numeric`),
	check("order_items_unit_price_check", sql`unit_price >= (0)::numeric`),
	check("order_items_discount_amount_check", sql`discount_amount >= (0)::numeric`),
]);

export const paymentsInBrewhub = brewhub.table("payments", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "payments_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }).notNull(),
	transactionType: varchar("transaction_type", { length: 20 }).default('PAYMENT').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentPaymentId: bigint("parent_payment_id", { mode: "number" }),
	method: varchar({ length: 40 }).notNull(),
	provider: varchar({ length: 80 }),
	providerReference: varchar("provider_reference", { length: 160 }),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	status: varchar({ length: 32 }).notNull(),
	failureCode: varchar("failure_code", { length: 80 }),
	failureMessage: text("failure_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ix_payments_order_status").using("btree", table.orderId.asc().nullsLast().op("int8_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("ix_payments_parent_payment").using("btree", table.parentPaymentId.asc().nullsLast().op("int8_ops")).where(sql`(parent_payment_id IS NOT NULL)`),
	uniqueIndex("uq_payments_provider_reference").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.providerReference.asc().nullsLast().op("text_ops")).where(sql`((provider IS NOT NULL) AND (provider_reference IS NOT NULL))`),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [ordersInBrewhub.id],
			name: "payments_order_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.parentPaymentId],
			foreignColumns: [table.id],
			name: "payments_parent_payment_id_fkey"
		}).onDelete("restrict"),
	check("payments_transaction_type_check", sql`(transaction_type)::text = ANY ((ARRAY['PAYMENT'::character varying, 'REFUND'::character varying])::text[])`),
	check("payments_amount_check", sql`amount > (0)::numeric`),
	check("ck_refund_has_parent", sql`(((transaction_type)::text = 'PAYMENT'::text) AND (parent_payment_id IS NULL)) OR (((transaction_type)::text = 'REFUND'::text) AND (parent_payment_id IS NOT NULL))`),
]);

export const inventoryInBrewhub = brewhub.table("inventory", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "inventory_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	onHandQty: numeric("on_hand_qty", { precision: 14, scale:  3 }).default('0').notNull(),
	reservedQty: numeric("reserved_qty", { precision: 14, scale:  3 }).default('0').notNull(),
	availableQty: numeric("available_qty", { precision: 14, scale:  3 }).generatedAlwaysAs(sql`(on_hand_qty - reserved_qty)`),
	reorderLevel: numeric("reorder_level", { precision: 14, scale:  3 }).default('0').notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_inventory_low_stock").using("btree", table.branchId.asc().nullsLast().op("numeric_ops"), table.availableQty.asc().nullsLast().op("int8_ops"), table.reorderLevel.asc().nullsLast().op("int8_ops")),
	index("ix_inventory_product_id").using("btree", table.productId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "inventory_branch_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBrewhub.id],
			name: "inventory_product_id_fkey"
		}).onDelete("restrict"),
	unique("uq_inventory_branch_product").on(table.branchId, table.productId),
	check("inventory_on_hand_qty_check", sql`on_hand_qty >= (0)::numeric`),
	check("inventory_reserved_qty_check", sql`reserved_qty >= (0)::numeric`),
	check("inventory_reorder_level_check", sql`reorder_level >= (0)::numeric`),
	check("inventory_version_check", sql`version > 0`),
	check("ck_inventory_reserved_not_over_on_hand", sql`reserved_qty <= on_hand_qty`),
]);

export const ordersInBrewhub = brewhub.table("orders", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "orders_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	orderNo: varchar("order_no", { length: 40 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	customerId: bigint("customer_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull(),
	status: varchar({ length: 32 }).default('DRAFT').notNull(),
	subtotal: numeric({ precision: 14, scale:  2 }).default('0').notNull(),
	discountAmount: numeric("discount_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 14, scale:  2 }).default('0').notNull(),
	totalAmount: numeric("total_amount", { precision: 14, scale:  2 }).generatedAlwaysAs(sql`GREATEST(round(((subtotal - discount_amount) + tax_amount), 2), (0)::numeric)`),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancellationReason: text("cancellation_reason"),
	source: varchar({ length: 20 }).default('POS').notNull(),
	orderType: varchar("order_type", { length: 20 }).default('TAKEOUT').notNull(),
}, (table) => [
	index("ix_orders_branch_created").using("btree", table.branchId.asc().nullsLast().op("int8_ops"), table.createdAt.desc().nullsFirst().op("int8_ops")),
	index("ix_orders_customer_created").using("btree", table.customerId.asc().nullsLast().op("int8_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(customer_id IS NOT NULL)`),
	index("ix_orders_status_created").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "orders_branch_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customersInBrewhub.id],
			name: "orders_customer_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [usersInBrewhub.id],
			name: "orders_created_by_user_id_fkey"
		}).onDelete("restrict"),
	unique("orders_order_no_key").on(table.orderNo),
	check("orders_subtotal_check", sql`subtotal >= (0)::numeric`),
	check("orders_discount_amount_check", sql`discount_amount >= (0)::numeric`),
	check("orders_tax_amount_check", sql`tax_amount >= (0)::numeric`),
	check("orders_version_check", sql`version > 0`),
	check("orders_source_check", sql`(source)::text = ANY ((ARRAY['CUSTOMER'::character varying, 'POS'::character varying])::text[])`),
	check("orders_order_type_check", sql`(order_type)::text = ANY ((ARRAY['DINE_IN'::character varying, 'TAKEOUT'::character varying])::text[])`),
	check("orders_status_check", sql`(status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PENDING_PAYMENT'::character varying, 'PAID'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])`),
]);

export const inventoryReservationsInBrewhub = brewhub.table("inventory_reservations", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "inventory_reservations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	quantity: numeric({ precision: 14, scale:  3 }).notNull(),
	status: varchar({ length: 20 }).default('ACTIVE').notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_reservations_active_expiry").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((status)::text = 'ACTIVE'::text)`),
	index("ix_reservations_product_status").using("btree", table.branchId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("int8_ops"), table.status.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_active_reservation_order_product").using("btree", table.orderId.asc().nullsLast().op("int8_ops"), table.productId.asc().nullsLast().op("int8_ops")).where(sql`((status)::text = 'ACTIVE'::text)`),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [ordersInBrewhub.id],
			name: "inventory_reservations_order_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "inventory_reservations_branch_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBrewhub.id],
			name: "inventory_reservations_product_id_fkey"
		}).onDelete("restrict"),
	check("inventory_reservations_quantity_check", sql`quantity > (0)::numeric`),
	check("inventory_reservations_status_check", sql`(status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'CONSUMED'::character varying, 'RELEASED'::character varying, 'EXPIRED'::character varying])::text[])`),
]);

export const stockMovementsInBrewhub = brewhub.table("stock_movements", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "stock_movements_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	productId: bigint("product_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	orderId: bigint("order_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reservationId: bigint("reservation_id", { mode: "number" }),
	movementType: varchar("movement_type", { length: 30 }).notNull(),
	onHandDelta: numeric("on_hand_delta", { precision: 14, scale:  3 }).default('0').notNull(),
	reservedDelta: numeric("reserved_delta", { precision: 14, scale:  3 }).default('0').notNull(),
	onHandAfter: numeric("on_hand_after", { precision: 14, scale:  3 }).notNull(),
	reservedAfter: numeric("reserved_after", { precision: 14, scale:  3 }).notNull(),
	reference: varchar({ length: 160 }),
	reason: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdByUserId: bigint("created_by_user_id", { mode: "number" }),
	traceId: varchar("trace_id", { length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_stock_movements_order_id").using("btree", table.orderId.asc().nullsLast().op("int8_ops")).where(sql`(order_id IS NOT NULL)`),
	index("ix_stock_movements_product_time").using("btree", table.branchId.asc().nullsLast().op("int8_ops"), table.productId.asc().nullsLast().op("int8_ops"), table.createdAt.desc().nullsFirst().op("int8_ops")),
	index("ix_stock_movements_trace_id").using("btree", table.traceId.asc().nullsLast().op("text_ops")).where(sql`(trace_id IS NOT NULL)`),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "stock_movements_branch_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [productsInBrewhub.id],
			name: "stock_movements_product_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [ordersInBrewhub.id],
			name: "stock_movements_order_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.reservationId],
			foreignColumns: [inventoryReservationsInBrewhub.id],
			name: "stock_movements_reservation_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [usersInBrewhub.id],
			name: "stock_movements_created_by_user_id_fkey"
		}).onDelete("restrict"),
	check("stock_movements_on_hand_after_check", sql`on_hand_after >= (0)::numeric`),
	check("stock_movements_reserved_after_check", sql`reserved_after >= (0)::numeric`),
	check("ck_stock_movement_nonzero", sql`(on_hand_delta <> (0)::numeric) OR (reserved_delta <> (0)::numeric)`),
	check("ck_stock_movement_valid_balance", sql`reserved_after <= on_hand_after`),
]);

export const idempotencyKeysInBrewhub = brewhub.table("idempotency_keys", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "idempotency_keys_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }),
	idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
	operation: varchar({ length: 80 }).notNull(),
	requestHash: char("request_hash", { length: 64 }).notNull(),
	status: varchar({ length: 20 }).default('PROCESSING').notNull(),
	resultReference: varchar("result_reference", { length: 160 }),
	responseCode: integer("response_code"),
	responseBody: jsonb("response_body"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("ix_idempotency_branch_user").using("btree", table.branchId.asc().nullsLast().op("timestamptz_ops"), table.userId.asc().nullsLast().op("int8_ops"), table.createdAt.desc().nullsFirst().op("int8_ops")),
	index("ix_idempotency_expiry").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "idempotency_keys_branch_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInBrewhub.id],
			name: "idempotency_keys_user_id_fkey"
		}).onDelete("set null"),
	unique("uq_idempotency_operation_key").on(table.idempotencyKey, table.operation),
	check("idempotency_keys_status_check", sql`(status)::text = ANY ((ARRAY['PROCESSING'::character varying, 'SUCCEEDED'::character varying, 'FAILED'::character varying])::text[])`),
]);

export const auditLogsInBrewhub = brewhub.table("audit_logs", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "audit_logs_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	actorUserId: bigint("actor_user_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }),
	action: varchar({ length: 100 }).notNull(),
	resourceType: varchar("resource_type", { length: 80 }).notNull(),
	resourceId: varchar("resource_id", { length: 160 }),
	beforeData: jsonb("before_data"),
	afterData: jsonb("after_data"),
	reason: text(),
	requestId: varchar("request_id", { length: 100 }),
	traceId: varchar("trace_id", { length: 100 }),
	sourceIp: inet("source_ip"),
}, (table) => [
	index("ix_audit_actor_time").using("btree", table.actorUserId.asc().nullsLast().op("int8_ops"), table.occurredAt.desc().nullsFirst().op("int8_ops")),
	index("ix_audit_resource_time").using("btree", table.resourceType.asc().nullsLast().op("text_ops"), table.resourceId.asc().nullsLast().op("timestamptz_ops"), table.occurredAt.desc().nullsFirst().op("timestamptz_ops")),
	index("ix_audit_trace_id").using("btree", table.traceId.asc().nullsLast().op("text_ops")).where(sql`(trace_id IS NOT NULL)`),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [usersInBrewhub.id],
			name: "audit_logs_actor_user_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "audit_logs_branch_id_fkey"
		}).onDelete("restrict"),
]);

export const userRolesInBrewhub = brewhub.table("user_roles", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	roleId: bigint("role_id", { mode: "number" }).notNull(),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInBrewhub.id],
			name: "user_roles_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [rolesInBrewhub.id],
			name: "user_roles_role_id_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pkey"}),
]);

export const userBranchesInBrewhub = brewhub.table("user_branches", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	userId: bigint("user_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	branchId: bigint("branch_id", { mode: "number" }).notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersInBrewhub.id],
			name: "user_branches_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branchesInBrewhub.id],
			name: "user_branches_branch_id_fkey"
		}).onDelete("restrict"),
	primaryKey({ columns: [table.userId, table.branchId], name: "user_branches_pkey"}),
]);
