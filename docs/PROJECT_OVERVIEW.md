# B2B Healthcare Marketplace — Project Overview

**Document for client**  
*Version 1.0*

---

## 1. What Is This Project?

**MedSupply** (B2B Healthcare Marketplace) is a **peer-to-peer (P2P) web platform** that lets **hospitals and healthcare organizations** buy and sell **surplus medical supplies** in a trusted, organized way.

- **Buyers:** Hospitals can discover surplus equipment and consumables listed by other hospitals, add items to a cart, choose a delivery address, and place orders.
- **Sellers:** Hospitals can list their surplus items (with category, quantity, price, optional expiry), manage listings, and respond to incoming orders (accept/reject).
- **Multi-tenant:** Each organization (hospital) has its own users, listings, and orders. The platform supports multiple hospitals; each one operates within the same marketplace.

The application is built with **Next.js**, **Ant Design**, **PostgreSQL**, and **NextAuth**, and is designed to scale to many listings and organizations.

---

## 2. User Types and What They Can Do

There are **three roles** in the system:

### 2.1 Platform Admin (Super Admin)

| Aspect | Description |
|--------|-------------|
| **Who** | Single platform-level role. Manages the whole marketplace. |
| **Purpose** | Approve new hospitals (organizations), manage categories, and view all listings across the platform. |
| **Main actions** | Approve or leave pending new hospital registrations; add, edit, and delete marketplace categories; view all listings from all hospitals. |
| **No** | Does not create listings or place orders for a specific hospital. |

**Menu:** Organizations, Categories, All listings, Profile.

---

### 2.2 Hospital Admin (Admin)

| Aspect | Description |
|--------|-------------|
| **Who** | Admin user for one hospital (organization). Typically the first user who registers the hospital. |
| **Purpose** | Manage the hospital’s listings, invite procurement users, and respond to orders placed by buyers. |
| **Main actions** | Create and edit listings (title, category, quantity, price, expiry); invite team members by email (with invite code); view and respond to **Pending** orders (accept/reject); manage the hospital’s presence on the marketplace. |
| **No** | Does not see the “Marketplace” as a buyer; does not place orders. |

**Menu:** My listings, Invite team, Pending, Profile.

---

### 2.3 Procurement User (Procurement)

| Aspect | Description |
|--------|-------------|
| **Who** | Team member of a hospital, invited by a Hospital Admin. Joins using an invite code. |
| **Purpose** | Browse the marketplace and place orders on behalf of their hospital. |
| **Main actions** | View **Marketplace** (listings from **other** hospitals only); add items to cart; manage **My Addresses** (multiple delivery addresses, set default); **Checkout** with address selection; view **My Orders**. |
| **No** | Cannot create or edit listings; cannot invite users; cannot accept/reject orders. |

**Menu:** Marketplace, My Orders, My Addresses, Profile. Cart icon in header for quick access.

---

## 3. Features (Summary)

### 3.1 Public / Guest

- **Landing page:** Explains the purpose of the platform (buy/sell surplus, invite team), what users can do, and how to join. **No listings are shown** until the user signs in.
- **Sign in / Sign up:** Links to login and registration.

### 3.2 Registration and Onboarding

- **New hospital:** Hospital Admin registers with hospital name; account stays **pending** until a Platform Admin approves the organization.
- **Join existing hospital:** User signs up with **invite code** from their Hospital Admin; they become a **Procurement** user for that hospital.
- **Invite by email:** Hospital Admin can enter an email and send a **professional invitation email** (inviter name, organization, invite code, link to sign up). Requires SMTP configuration.

### 3.3 Marketplace (Buy Side)

- **Marketplace page:** Shown only to **Procurement** (and Super Admin if they open the page). **Hospital Admin does not see the Marketplace link** and is redirected to My listings if they open the homepage.
- **Listings from other hospitals only:** Procurement users see only listings from **other** organizations (their own hospital’s listings are excluded).
- **Filters:** Category, seller (organization), price min/max, sort (latest, price low/high). Pagination.
- **Cart:** Add to cart from marketplace; cart icon in header with count; **Cart** page to adjust quantity or remove items.
- **Checkout:** Select delivery address (from **My Addresses**), add new address if needed, place order. One order per cart line item; each order stores the chosen delivery address.

### 3.4 Listings (Sell Side)

- **Categories:** Managed by **Platform Admin** (add, edit, delete). Used as a **dropdown** when creating/editing listings and in marketplace filters.
- **Create / Edit listing:** Hospital Admin (and only Admin) can create and edit listings: title, description, **category** (from dropdown), quantity, price per unit, optional expiry date.
- **My listings:** Hospital Admin sees their hospital’s listings; can filter by title, category, status; can deactivate or edit.

### 3.5 Orders

- **Place order:** Procurement user checks out; orders are created with selected delivery address; cart is cleared after success.
- **Pending orders (seller):** Hospital Admin sees **Pending** orders for their hospital; can **Accept** or **Reject**. Accept moves to Reserved/Confirmed flow; Reject restores seller stock.
- **My Orders (buyer):** Procurement user sees their order history.

### 3.6 Addresses and Profile

- **My Addresses:** Procurement users can add, edit, and delete delivery addresses; set a **default** address (used as pre-selected at checkout).
- **Profile:** All users can update **first name** and **last name**; view email, role, organization. **Change password** tab for updating password.

### 3.7 Platform Administration

- **Organizations:** Platform Admin sees all hospitals; can **approve** pending ones so they can sign in and use the platform.
- **Categories:** Platform Admin can add, edit, and delete categories (used in listing and filter dropdowns).
- **All listings:** Platform Admin can view all listings across all hospitals.

---

## 4. What the System Does (End-to-End)

1. **New hospital:** Registers → status PENDING → Platform Admin approves → Hospital Admin can sign in.
2. **Hospital Admin:** Creates listings (with category from dropdown), invites Procurement users by email (optional), sees Pending orders and accepts/rejects.
3. **Procurement:** Signs in (or joins with invite code) → opens **Marketplace** → sees only **other** hospitals’ listings → adds to cart → goes to **Cart** → **Checkout** → selects or adds address → places order.
4. **Seller hospital:** Sees order in **Pending** → accepts or rejects → order moves to next state; buyer sees order in **My Orders**.

The platform is **multi-tenant**: each hospital’s data (listings, orders, users, addresses) is scoped to that organization. The marketplace brings buyers and sellers together while keeping each hospital’s data separate.

---

## 5. Technology Overview (for reference)

- **Frontend:** Next.js (App Router), React, Ant Design.
- **Backend:** Next.js API routes, Prisma ORM, PostgreSQL.
- **Auth:** NextAuth (credentials: email + password).
- **Email (invites):** Nodemailer (SMTP); optional configuration.

---

*This document describes the B2B Healthcare Marketplace (MedSupply) as of the current implementation. For technical setup or deployment, refer to the project’s README and environment configuration.*
