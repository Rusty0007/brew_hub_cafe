import { relations } from "drizzle-orm/relations";
import { categoriesInBrewhub, productsInBrewhub, usersInBrewhub, customersInBrewhub, ordersInBrewhub, orderItemsInBrewhub, paymentsInBrewhub, branchesInBrewhub, inventoryInBrewhub, inventoryReservationsInBrewhub, stockMovementsInBrewhub, idempotencyKeysInBrewhub, auditLogsInBrewhub, userRolesInBrewhub, rolesInBrewhub, userBranchesInBrewhub } from "./schema";

export const productsInBrewhubRelations = relations(productsInBrewhub, ({one, many}) => ({
	categoriesInBrewhub: one(categoriesInBrewhub, {
		fields: [productsInBrewhub.categoryId],
		references: [categoriesInBrewhub.id]
	}),
	orderItemsInBrewhubs: many(orderItemsInBrewhub),
	inventoryInBrewhubs: many(inventoryInBrewhub),
	inventoryReservationsInBrewhubs: many(inventoryReservationsInBrewhub),
	stockMovementsInBrewhubs: many(stockMovementsInBrewhub),
}));

export const categoriesInBrewhubRelations = relations(categoriesInBrewhub, ({many}) => ({
	productsInBrewhubs: many(productsInBrewhub),
}));

export const customersInBrewhubRelations = relations(customersInBrewhub, ({one, many}) => ({
	usersInBrewhub: one(usersInBrewhub, {
		fields: [customersInBrewhub.userId],
		references: [usersInBrewhub.id]
	}),
	ordersInBrewhubs: many(ordersInBrewhub),
}));

export const usersInBrewhubRelations = relations(usersInBrewhub, ({many}) => ({
	customersInBrewhubs: many(customersInBrewhub),
	ordersInBrewhubs: many(ordersInBrewhub),
	stockMovementsInBrewhubs: many(stockMovementsInBrewhub),
	idempotencyKeysInBrewhubs: many(idempotencyKeysInBrewhub),
	auditLogsInBrewhubs: many(auditLogsInBrewhub),
	userRolesInBrewhubs: many(userRolesInBrewhub),
	userBranchesInBrewhubs: many(userBranchesInBrewhub),
}));

export const orderItemsInBrewhubRelations = relations(orderItemsInBrewhub, ({one}) => ({
	ordersInBrewhub: one(ordersInBrewhub, {
		fields: [orderItemsInBrewhub.orderId],
		references: [ordersInBrewhub.id]
	}),
	productsInBrewhub: one(productsInBrewhub, {
		fields: [orderItemsInBrewhub.productId],
		references: [productsInBrewhub.id]
	}),
}));

export const ordersInBrewhubRelations = relations(ordersInBrewhub, ({one, many}) => ({
	orderItemsInBrewhubs: many(orderItemsInBrewhub),
	paymentsInBrewhubs: many(paymentsInBrewhub),
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [ordersInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
	customersInBrewhub: one(customersInBrewhub, {
		fields: [ordersInBrewhub.customerId],
		references: [customersInBrewhub.id]
	}),
	usersInBrewhub: one(usersInBrewhub, {
		fields: [ordersInBrewhub.createdByUserId],
		references: [usersInBrewhub.id]
	}),
	inventoryReservationsInBrewhubs: many(inventoryReservationsInBrewhub),
	stockMovementsInBrewhubs: many(stockMovementsInBrewhub),
}));

export const paymentsInBrewhubRelations = relations(paymentsInBrewhub, ({one, many}) => ({
	ordersInBrewhub: one(ordersInBrewhub, {
		fields: [paymentsInBrewhub.orderId],
		references: [ordersInBrewhub.id]
	}),
	paymentsInBrewhub: one(paymentsInBrewhub, {
		fields: [paymentsInBrewhub.parentPaymentId],
		references: [paymentsInBrewhub.id],
		relationName: "paymentsInBrewhub_parentPaymentId_paymentsInBrewhub_id"
	}),
	paymentsInBrewhubs: many(paymentsInBrewhub, {
		relationName: "paymentsInBrewhub_parentPaymentId_paymentsInBrewhub_id"
	}),
}));

export const inventoryInBrewhubRelations = relations(inventoryInBrewhub, ({one}) => ({
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [inventoryInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
	productsInBrewhub: one(productsInBrewhub, {
		fields: [inventoryInBrewhub.productId],
		references: [productsInBrewhub.id]
	}),
}));

export const branchesInBrewhubRelations = relations(branchesInBrewhub, ({many}) => ({
	inventoryInBrewhubs: many(inventoryInBrewhub),
	ordersInBrewhubs: many(ordersInBrewhub),
	inventoryReservationsInBrewhubs: many(inventoryReservationsInBrewhub),
	stockMovementsInBrewhubs: many(stockMovementsInBrewhub),
	idempotencyKeysInBrewhubs: many(idempotencyKeysInBrewhub),
	auditLogsInBrewhubs: many(auditLogsInBrewhub),
	userBranchesInBrewhubs: many(userBranchesInBrewhub),
}));

export const inventoryReservationsInBrewhubRelations = relations(inventoryReservationsInBrewhub, ({one, many}) => ({
	ordersInBrewhub: one(ordersInBrewhub, {
		fields: [inventoryReservationsInBrewhub.orderId],
		references: [ordersInBrewhub.id]
	}),
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [inventoryReservationsInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
	productsInBrewhub: one(productsInBrewhub, {
		fields: [inventoryReservationsInBrewhub.productId],
		references: [productsInBrewhub.id]
	}),
	stockMovementsInBrewhubs: many(stockMovementsInBrewhub),
}));

export const stockMovementsInBrewhubRelations = relations(stockMovementsInBrewhub, ({one}) => ({
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [stockMovementsInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
	productsInBrewhub: one(productsInBrewhub, {
		fields: [stockMovementsInBrewhub.productId],
		references: [productsInBrewhub.id]
	}),
	ordersInBrewhub: one(ordersInBrewhub, {
		fields: [stockMovementsInBrewhub.orderId],
		references: [ordersInBrewhub.id]
	}),
	inventoryReservationsInBrewhub: one(inventoryReservationsInBrewhub, {
		fields: [stockMovementsInBrewhub.reservationId],
		references: [inventoryReservationsInBrewhub.id]
	}),
	usersInBrewhub: one(usersInBrewhub, {
		fields: [stockMovementsInBrewhub.createdByUserId],
		references: [usersInBrewhub.id]
	}),
}));

export const idempotencyKeysInBrewhubRelations = relations(idempotencyKeysInBrewhub, ({one}) => ({
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [idempotencyKeysInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
	usersInBrewhub: one(usersInBrewhub, {
		fields: [idempotencyKeysInBrewhub.userId],
		references: [usersInBrewhub.id]
	}),
}));

export const auditLogsInBrewhubRelations = relations(auditLogsInBrewhub, ({one}) => ({
	usersInBrewhub: one(usersInBrewhub, {
		fields: [auditLogsInBrewhub.actorUserId],
		references: [usersInBrewhub.id]
	}),
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [auditLogsInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
}));

export const userRolesInBrewhubRelations = relations(userRolesInBrewhub, ({one}) => ({
	usersInBrewhub: one(usersInBrewhub, {
		fields: [userRolesInBrewhub.userId],
		references: [usersInBrewhub.id]
	}),
	rolesInBrewhub: one(rolesInBrewhub, {
		fields: [userRolesInBrewhub.roleId],
		references: [rolesInBrewhub.id]
	}),
}));

export const rolesInBrewhubRelations = relations(rolesInBrewhub, ({many}) => ({
	userRolesInBrewhubs: many(userRolesInBrewhub),
}));

export const userBranchesInBrewhubRelations = relations(userBranchesInBrewhub, ({one}) => ({
	usersInBrewhub: one(usersInBrewhub, {
		fields: [userBranchesInBrewhub.userId],
		references: [usersInBrewhub.id]
	}),
	branchesInBrewhub: one(branchesInBrewhub, {
		fields: [userBranchesInBrewhub.branchId],
		references: [branchesInBrewhub.id]
	}),
}));