# 🔥 FIREBASE DATABASE SCHEMA (SuperMall App)

**Version 1.0** – Structured Firestore Schema Documentation

## 🏗 Root Collections Overview

The Firebase Firestore database contains the following main collections:

- **products**
- **users**
- **carts**
- **orders**
- **favorites** (optional, depending on final implementation)
- **manage**

This document describes the full structure of each collection, recommended fields, and behaviors.

---

## 📁 1. products Collection

### Document Example
```json
{
  "name": "Asus Zenbook S 13 OLED UX5304MA-NQ007WS",
  "description": "Brand: ASUS ...",
  "category": "Computers",
  "price": 60999,
  "discount": 10,
  "image": "https://i.ibb.co/...",
  "stockQuantity": 8,
  "availableQuantityForOrder": 6,
  "addedBy": "admin@example.com",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### Field Description
| Field | Type | Description |
|-------|------|-------------|
| name | string | Product title |
| description | string | Full detailed description |
| category | string | Category name (e.g., Computers) |
| price | number | Product price |
| discount | number | Percentage discount |
| image | string (URL) | Product cover image |
| stockQuantity | number | Total stock |
| availableQuantityForOrder | number | Limit per order |
| addedBy | string | Admin email/UID |
| createdAt | timestamp | Auto timestamp |
| updatedAt | timestamp | Auto timestamp |

---

## 📁 2. users Collection

### Document Example
```json
{
  "uid": "4735iEmAefMDpslh6g3ADvtfMJX2",
  "email": "example@gmail.com",
  "fullname": "Anas Gamal",
  "username": "ANOUS",
  "phone": "01000000000",
  "image": "https://i.ibb.co/...",
  "isBlocked": false,
  "preferredCategories": ["Mobile", "TVs"],
  "createdAt": "serverTimestamp"
}
```

### Field Description
| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Authentication UID |
| email | string | User email |
| fullname | string | Full name |
| username | string | Public username |
| phone | string | Phone number |
| image | string | Profile picture URL |
| isBlocked | boolean | Access control |
| preferredCategories | array | User interests |
| createdAt | timestamp | Profile creation timestamp |

**Note:**
- This document must remain lightweight.
- Never store cart or orders inside the user document.

---

## 📁 3. carts Collection

**Each user has one document only:** `carts/{uid}`

### Document Example
```json
{
  "userId": "4735iEmAefMDpslh6g3ADvtfMJX2",
  "items": {
    "OS6jyRrhnZjS0l2jWLOa": { "productId": "OS6jyRrhnZjS0l2jWLOa", "qty": 2, "priceAt": 60999 },
    "1TqDirYgEhgouWsceV2c": { "productId": "1TqDirYgEhgouWsceV2c", "qty": 1, "priceAt": 6599 }
  },
  "updatedAt": "serverTimestamp"
}
```

### Field Description
| Field | Type | Description |
|-------|------|-------------|
| userId | string | Cart owner's uid |
| items | map | Each key is a productId → { qty, priceAt } |
| updatedAt | timestamp | Used for sync + conflict resolution |

---

## 📁 4. orders Collection

**Each order is a standalone document.**

### Document Example
```json
{
  "orderId": "order_abc123",
  "userId": "4735iEmAefMDpslh6g3ADvtfMJX2",
  "createdAt": "serverTimestamp",
  "items": [
    { "productId": "OS6jy...", "name": "Asus...", "qty": 2, "priceAt": 60999 }
  ],
  "addressSnapshot": {
    "FullName": "Anas",
    "Phone": "0100000000",
    "City": "Cairo",
    "State": "Giza",
    "Street": "Street Name",
    "ZIP": "646"
  },
  "paymentMethod": "CASH",
  "shippingFee": 35,
  "subtotal": 121998,
  "total": 122033,
  "status": "PENDING"
}
```

---

## 📁 5. favorites Collection (optional)

**Two implementations possible:**

### A) One doc per user
```json
{
  "userId": "4735i...",
  "items": ["OS6jyRrh...", "1TqDirYg..."]
}
```

### B) Subcollection inside user (recommended for heavy toggle use)
`users/{uid}/favorites/{productId}`

---

## 📁 6. manage Collection

**Used for app-wide configuration and homepage content.**

### Document Example
```json
{
  "Ad": [
    {
      "action": "offer",
      "content": "Big discount on laptops!",
      "img": "https://i.ibb.co/...",
      "id": "",
      "SearchKey": ""
    },
    {
      "action": "navigate",
      "id": "OS6jyRrhnZjS0l2jWLOa",
      "img": "https://i.ibb.co/...",
      "content": "",
      "SearchKey": ""
    },
    {
      "action": "search",
      "SearchKey": "honor",
      "img": "https://i.ibb.co/...",
      "content": "",
      "id": ""
    }
  ],

  "AvailableCategory": ["Mobile", "Computers", "TVs"],
  "AvailableRegion": ["Cairo", "Giza", "Alexandria"],
  "RegionFee": {
    "Cairo": 35,
    "Alexandria": 50,
    "Aswan": 75
  },
  "NewArrival": ["OS6jyRrhnZjS0l2jWLOa"],
  "TopSelling": ["1TqDirYgEhgouWsceV2c"]
}
```

---

## 🎯 Ad Types (Inside manage.Ad)

### 1️⃣ action: "offer"

Navigates user to a special offer screen.

**Uses:**
- `content` → offer description
- `img` → ad image

**Example:**
```json
{
  "action": "offer",
  "content": "Weekend sale: 30% off!",
  "img": "https://i.ibb.co/..."
}
```

### 2️⃣ action: "navigate"

Navigates user to a product page.

**Uses:**
- `id` → productId
- `img` → banner image

**Example:**
```json
{
  "action": "navigate",
  "id": "OS6jyRrhnZjS0l2jWLOa",
  "img": "https://i.ibb.co/..."
}
```

### 3️⃣ action: "search"

Navigates user to the search screen with a filter applied.

**Uses:**
- `SearchKey` → keyword (brand, category, etc.)
- `img`

**Example:**
```json
{
  "action": "search",
  "SearchKey": "honor",
  "img": "https://i.ibb.co/..."
}
```

---

## 📋 Complete Database Schema

Below is the complete Firestore database schema in JSON format:

```json
{
  "collections": {
    "products": {
      "exampleDocId": "OS6jyRrhnZjS0l2jWLOa",
      "document": {
        "name": "Asus Zenbook S 13 OLED UX5304MA-NQ007WS",
        "description": "Brand: ASUS ...",
        "category": "Computers",
        "price": 60999,
        "discount": 10,
        "image": "https://i.ibb.co/...",
        "stockQuantity": 8,
        "availableQuantityForOrder": 6,
        "addedBy": "anslahga@gmail.com",
        "createdAt": "serverTimestamp",
        "updatedAt": "serverTimestamp"
      }
    },

    "users": {
      "exampleDocId": "4735iEmAefMDpslh6g3ADvtfMJX2",
      "document": {
        "uid": "4735iEmAefMDpslh6g3ADvtfMJX2",
        "email": "ans@gmail.com",
        "fullname": "Anas gamal kamel",
        "username": "ANOUS",
        "phone": "01032672532",
        "image": "https://i.ibb.co/...",
        "isBlocked": false,
        "preferredCategories": ["Mobile", "TVs"],
        "createdAt": "serverTimestamp"
      }
    },

    "carts": {
      "exampleDocId": "4735iEmAefMDpslh6g3ADvtfMJX2",
      "document": {
        "userId": "4735iEmAefMDpslh6g3ADvtfMJX2",
        "items": {
          "OS6jyRrhnZjS0l2jWLOa": { "productId": "OS6jyRrhnZjS0l2jWLOa", "qty": 2, "priceAt": 60999 },
          "1TqDirYgEhgouWsceV2c": { "productId": "1TqDirYgEhgouWsceV2c", "qty": 1, "priceAt": 6599 }
        },
        "updatedAt": "serverTimestamp"
      }
    },

    "orders": {
      "exampleDocId": "order_abc123",
      "document": {
        "orderId": "order_abc123",
        "userId": "4735iEmAefMDpslh6g3ADvtfMJX2",
        "createdAt": "serverTimestamp",
        "items": [
          { "productId": "OS6jyRrhnZjS0l2jWLOa", "name": "Asus ...", "qty": 2, "priceAt": 60999 }
        ],
        "addressSnapshot": {
          "FullName": "Anas",
          "Phone": "01032672532",
          "City": "Cairo",
          "State": "Giza",
          "Street": "Some street",
          "ZIP": "646"
        },
        "paymentMethod": "CASH",
        "shippingFee": 35,
        "subtotal": 121998,
        "total": 122033,
        "status": "PENDING"
      }
    },

    "favorites": {
      "exampleDocId": "4735iEmAefMDpslh6g3ADvtfMJX2",
      "document": {
        "userId": "4735iEmAefMDpslh6g3ADvtfMJX2",
        "items": ["OS6jyRrhnZjS0l2jWLOa", "1TqDirYgEhgouWsceV2c"]
      }
    },

    "manage": {
      "exampleDocId": "site_config",
      "document": {
        "Ad": [
          { "action": "offer", "content": "Big discount on laptops", "img": "https://i.ibb.co/...", "id": "", "SearchKey": "" },
          { "action": "navigate", "id": "OS6jyRrhnZjS0l2jWLOa", "img": "https://i.ibb.co/...", "content": "", "SearchKey": "" },
          { "action": "search", "SearchKey": "honor", "img": "https://i.ibb.co/...", "content": "", "id": "" }
        ],
        "AvailableCategory": ["Mobile", "Computers", "TVs"],
        "AvailableRegion": ["Cairo", "Giza", "Alexandria"],
        "RegionFee": { "Cairo": 35, "Alexandria": 50, "Aswan": 75 },
        "NewArrival": ["OS6jyRrhnZjS0l2jWLOa"],
        "TopSelling": ["1TqDirYgEhgouWsceV2c"]
      }
    }
  }
}
```