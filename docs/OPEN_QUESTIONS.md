# BrewHub Cafe — Open Questions

The following items are **not fully specified by the TESDA assessment**.

Do not silently assume answers. Decide them with your instructor/client or document your assumptions.

## Users and Security

- What staff roles exist?
- What can each role do?
- Does BrewHub require MFA?
- What is the password policy?
- How long should staff sessions remain active?
- Which actions require manager approval?

## Customers

- Is a customer record required for every order?
- Is guest/walk-in checkout allowed?
- What customer information is stored?
- Will loyalty be attached to customer accounts later?

## Products and Menu

- Do products have sizes or variants?
- Are add-ons/modifiers supported?
- Can prices differ by branch?
- Can products be temporarily unavailable?
- Are taxes included in displayed prices?

## Orders

- What order statuses exist?
- Can completed orders be edited?
- When may an order be cancelled?
- Is dine-in/takeout tracked?
- Will delivery/online orders use the same order model?
- What is the order-number format?

## Payments

- What payment methods are supported?
- Is cash supported?
- Is card/e-wallet integration required now?
- Are split payments supported?
- Are partial payments supported?
- Who may issue refunds?
- Can refunds be partial?
- What happens when payment status is unknown?

## Inventory

- Is inventory tracked as finished menu products, ingredients, or both?
- Are recipes/BOMs required?
- What units are used (piece, gram, ml, etc.)?
- Are stock transfers between branches required?
- How is spoilage/waste recorded?
- Are physical stock counts required?
- Are low-stock alerts required?
- Can stock ever be negative?

## Branches

- Is branch data isolated?
- Can staff work at multiple branches?
- Can customers be shared globally across branches?
- Do prices vary per branch?
- What should happen if branch internet is unavailable?

## Reports

- Which reports are mandatory?
- What date/time zone should reports use?
- Can reports query live operational tables?
- How long must historical reports remain available?

## Retention and Recovery

- How long should orders be retained?
- How long should audit logs be retained?
- How long should structured logs be retained?
- How long should idempotency records be retained?
- What backup frequency is required?
- What are the recovery point (RPO) and recovery time (RTO) targets?

## Important Cafe-Specific Question

The assessment says BrewHub needs products and inventory, but it does not say whether inventory represents menu items or ingredients.

Example:

```text
1 Iced Latte sold
    -> espresso decreases
    -> milk decreases
    -> cup decreases
    -> lid decreases
```

If ingredient-level inventory is required, additional concepts such as ingredients, recipes, and recipe items may be needed.

This should be treated as a future requirement/design decision unless your instructor explicitly requires it now.
