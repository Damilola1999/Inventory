# Inventory & Order Management API

Node.js + Express + MongoDB (Mongoose), JWT auth, role-based access.

## Setup
```bash
npm install
cp .env.example .env      # edit MONGO_URI and JWT_SECRET
npm run seed:admin        # creates the first admin
npm run dev
```

## Roles
| Role     | Can do |
|----------|--------|
| admin    | Everything: manage products, stock, users (create staff), update order status |
| staff    | View products/low stock, view all orders, update order status |
| customer | Browse products, place orders, view/cancel own pending orders |

## Endpoints (all except register/login need `Authorization: Bearer <token>`)

**Auth**
- `POST /api/auth/register` `{name,email,password}` (creates a customer)
- `POST /api/auth/login` `{email,password}`
- `GET  /api/auth/me`

**Users (admin)**
- `POST /api/users` `{name,email,password,role}` (create staff/admin)
- `GET  /api/users?role=staff`
- `PATCH /api/users/:id` `{name?,role?,isActive?}`

**Products**
- `GET  /api/products?search=&category=&minPrice=&maxPrice=&inStock=true&page=&limit=&sort=`
- `GET  /api/products/:id`
- `POST /api/products` (admin) `{name,sku,price,stock,category?,description?,lowStockThreshold?}`
- `PATCH /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin, soft delete)
- `POST /api/products/:id/stock` (admin) `{change: 10}` or `{change: -3}`
- `GET  /api/products/low-stock` (admin/staff)

**Orders**
- `POST  /api/orders` (customer)
  ```json
  { "items": [{ "productId": "...", "quantity": 2 }],
    "shippingAddress": { "line1": "12 Allen Ave", "city": "Lagos" } }
  ```
- `GET   /api/orders?status=pending&page=1` (customers: own; staff/admin: all)
- `GET   /api/orders/:id`
- `PATCH /api/orders/:id/status` (admin/staff) `{status, note?}`
- `PATCH /api/orders/:id/cancel` (customer, pending only)
- `GET   /api/orders/stats` (admin/staff)

## Order lifecycle
`pending → confirmed → processing → shipped → delivered`, and `cancelled` from pending/confirmed/processing.
Cancelling restocks the items.

## Design notes
- **No overselling:** stock is reserved with an atomic `findOneAndUpdate` (`stock >= qty`), and rolled back if any line fails. Works on a standalone MongoDB (no replica set needed).
- **Price snapshots:** orders store name/SKU/price at purchase time.
- **Soft delete:** products are deactivated, not removed, so order history stays valid.
- Public registration can only create customers; staff are created by an admin.
