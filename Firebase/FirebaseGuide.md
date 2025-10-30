# Firebase Guide

## 💖 Favorite Functions

This section explains how to manage the user's "Wishlist" in a synchronized and efficient manner across all parts of the application.

---

### 1. listenToUserFavorites

**What it does:**
This is the "Reader/Listener" function (🎧). It uses `onSnapshot` to open a real-time, continuous connection to the user's document. It immediately provides the current list of favorite product IDs and then *automatically* pushes any new updates (adds or removes) to all components that are "listening." This ensures the UI is always synchronized.

**Signature:**
```javascript
listenToUserFavorites(userId: string, callback: (favList: string[]) => void): () => void
```
Returns: An unsubscribe function. You must call this function when your component unmounts (in the useEffect cleanup) to close the connection and save resources.

**Used By:**
- app/(tabs)/home.jsx
- app/(tabs)/products.jsx
- app/Pages/singlepage.jsx
- app/(ProfileTabs)/Wishlist.tsx

**Code Example (How to use in a component):**
```javascript
import { listenToUserFavorites, auth } from './Firebase/Firebase';
import React, { useState, useEffect } from 'react';

const ProductsComponent = () => {
  const [favoriteIds, setFavoriteIds] = useState([]);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      // 1. Start listening
      const unsubscribe = listenToUserFavorites(userId, (ids) => {
        // 2. Update state every time the list changes in Firebase
        console.log('Favorites list updated!', ids);
        setFavoriteIds(ids);
      });
      
      // 3. Stop listening when the component unmounts
      return () => unsubscribe();
    }
  }, [userId]);

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
};
```

### 2. toggleFavorite
**What it does:** This is the "Writer/Action" function (✍️). It executes the action of adding OR removing a product from the user's favorites list. It automatically checks if the product is already in the list:

- If found, it removes the ID (using `arrayRemove`).
- If not found, it adds the ID (using `arrayUnion`).

**Note:** You do not need to manually update your state after calling this function. The `listenToUserFavorites` function will detect the change and update your state automatically.

**Signature:**
```javascript
async toggleFavorite(userId: string, productId: string): Promise<{success: boolean, newStatus: boolean}>
```
Returns: A Promise that resolves with the success status and the `newStatus` (true if added, false if removed).

**Used By:**
- `app/(tabs)/home.jsx` (via its `handleFavoriteToggle` function)
- `app/(tabs)/products.jsx` (via its `handleFavoriteToggle` function)
- `app/Pages/singlepage.jsx` (via its `handleFavorite` and `handleFavoriteToggle` functions)
- `app/(ProfileTabs)/Wishlist.tsx` (via its `removeFromFavorites` function)

**Code Example (How to call the function):**
```javascript
import { toggleFavorite, auth } from './Firebase/Firebase';

const handleHeartClick = async (productId) => {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log('User must be logged in.');
    return;
  }
  
  // Just call the function. The listener will handle the UI update.
  const result = await toggleFavorite(userId, productId);
  
  if (result.success) {
    if (result.newStatus === true) {
      console.log('Product added to favorites!');
    } else {
      console.log('Product removed from favorites!');
    }
  } else {
    console.log('Error:', result.error);
  }
};
```

## 📁 Category Functions

This section explains how to manage the available "Categories" in the store and user preferences in an efficient, cache-based manner.

---

### 1. syncAvailableCategories

**Description (Reader & Cacher 💾):**
This is the "main" function for fetching general categories. It is responsible for fetching the list of "Available Categories" (`AvilableCategory`) from the `Manage` collection (set by the admin). It parses this list, then caches it in `AsyncStorage` (for speed and cost savings). Finally, it returns the clean list to be used directly in the UI (e.g., for filters).

**Signature:**
```javascript
async syncAvailableCategories(): Promise<{success: boolean, data: Category[]}>
```
Returns: A Promise containing `success: true` and the clean (parsed) list of categories in `data`.

**Used By:**
- `app/(tabs)/home.jsx` (on initial load and on Refresh)
- `app/(tabs)/products.jsx` (on initial load and on Refresh)
- `app/CategorySelection.jsx` (when the page is first opened)
- `app/(ProfileTabs)/Settings.tsx` (when the "Edit Categories" button is pressed)

**Code Example (How to use in a component):**
```javascript
// Used when fresh data is needed from Firebase (e.g., initial load or Refresh)
const loadFreshCategories = async () => {
  const { success, data: cats } = await syncAvailableCategories();
  if (success) {
    setCategories(cats);
  }
};
```

### 2. loadCachedCategories
**Description (Fast Reader ⚡):**
This is the "fast read" function for general categories. Its job is to read the list of "Available Categories" only from `AsyncStorage` (the cache). It does not connect to Firebase. This function is used for quick navigation between tabs (in `useFocusEffect`) to ensure state synchronization between pages if another page has performed a Refresh.

**Signature:**
```javascript
async loadCachedCategories(): Promise<{success: boolean, data: Category[]}>
```
Returns: A Promise containing `success: true` and the clean (parsed) list of categories from the cache.

**Used By:**
- `app/(tabs)/home.jsx` (inside `useFocusEffect`)
- `app/(tabs)/products.jsx` (inside `useFocusEffect`)

**Code Example (How to use in `useFocusEffect`):**
```javascript
import { useFocusEffect } from 'expo-router';
import { loadCachedCategories } from './Firebase/Firebase';

// ...
useFocusEffect(
  React.useCallback(() => {
    const loadFromCache = async () => {
      // Reads from cache only (very fast)
      const { data: cats } = await loadCachedCategories();
      setCategories(cats);
    };
    loadFromCache();
  }, [])
);
```

### 3. updateUserPreferredCategories
**Description (Writer ✍️):**
This is the "write" function for user preferences. It is responsible for saving or updating the user's list of "Preferred Categories". It takes a list of category names (`string[]`) and updates the `preferredCategories` field in the user's document. It also updates the `UserObject` stored in `AsyncStorage` to ensure user data is synchronized.

**Signature:**
```javascript
async updateUserPreferredCategories(userId: string, categoriesList: string[]): Promise<{success: boolean, error?: string}>
```
Returns: A Promise indicating if the operation succeeded (`success: true`) or failed (`success: false`).

**Used By:**
- `app/CategorySelection.jsx` (when a new user selects their preferences)
- `app/(ProfileTabs)/Settings.tsx` (when an existing user modifies their preferences)

**Code Example (How to use in a component):**
```javascript
import { updateUserPreferredCategories, auth } from './Firebase/Firebase';

const handleSavePreferences = async (selectedCategories) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  
  const result = await updateUserPreferredCategories(userId, selectedCategories);
  if (result.success) {
    console.log('Preferences saved successfully!');
  }
};
```

### 4. syncUserPreferredCategories
**Description (Login Sync 🔄):**
This function is used once when the user logs in (in `Login.jsx`). Its job is to fetch the user's `preferredCategories` from Firebase and store them in `AsyncStorage` (inside the `UserObject`). This ensures the `home` page is ready to display the "Recommended for You" section as soon as it opens.

**Signature:**
```javascript
async syncUserPreferredCategories(userId: string): Promise<void>
```
Returns: Nothing. It just performs the sync in the background.

**Used By:**
- `Authentication/Login.jsx` (inside the `signin` function on success)

**Code Example (How to use in `Login.jsx`):**
```javascript
// ... inside the signin function
if (result.success) {
  const user = result.user;
  const userData = await getUserData(user.uid);
  
  if (userData) {
    // ... (store UserObject) ...
    // Sync their preferences to the cache
    await syncUserPreferredCategories(user.uid); 
    router.replace('/home');
  }
}
```

### 5. loadCachedPreferredCategories
**Description (Preferences Reader 👓):**
This is the "fast reader" for user preferences. It does not connect to Firebase; instead, it reads the `UserObject` directly from `AsyncStorage` and extracts the `preferredCategories` list from it.

**Signature:**
```javascript
async loadCachedPreferredCategories(): Promise<string[]>
```
Returns: A Promise containing the list of preferences (e.g., `['Electronics', 'Men']`).

**Used By:**
- `app/(tabs)/home.jsx` (to display the "Recommended for You" section)
- `app/(ProfileTabs)/Settings.tsx` (to display current preferences before editing)

**Code Example (How to use in `home.jsx`):**
```javascript
import { loadCachedPreferredCategories } from './Firebase/Firebase';

const fetchRecommendedProducts = async () => {
  // Reads preferences from cache (very fast)
  const categories = await loadCachedPreferredCategories();
  if (categories.length === 0) return;
  
  // ... (fetches products based on these categories) ...
};
```

## المصادقة (Authentication)

### تسجيل الدخول
```javascript
import { signIn } from './Firebase/Firebase';

const handleLogin = async () => {
  const result = await signIn('user@example.com', 'password123');
  if (result.success) {
    console.log('تم تسجيل الدخول بنجاح', result.user);
  } else {
    console.log('خطأ:', result.error);
  }
};
```

### إنشاء حساب جديد
```javascript
import { signUp } from './Firebase/Firebase';

const handleSignUp = async () => {
  const userData = {
    username: 'أحمد محمد',
    phone: '0123456789'
  };
  
  const result = await signUp('user@example.com', 'password123', userData);
  if (result.success) {
    console.log('تم إنشاء الحساب بنجاح', result.user);
  } else {
    console.log('خطأ:', result.error);
  }
};
```

### تسجيل الخروج
```javascript
import { signOut } from './Firebase/Firebase';

const handleLogout = async () => {
  const result = await signOut();
  if (result.success) {
    console.log('تم تسجيل الخروج بنجاح');
  }
};
```

### إعادة تعيين كلمة المرور
```javascript
import { resetPassword } from './Firebase/Firebase';

const handlePasswordReset = async () => {
  const result = await resetPassword('user@example.com');
  if (result.success) {
    console.log('تم إرسال رابط إعادة التعيين');
  }
};
```

### مراقبة حالة تسجيل الدخول
```javascript
import { onAuthStateChange } from './Firebase/Firebase';

useEffect(() => {
  const unsubscribe = onAuthStateChange((user) => {
    if (user) {
      console.log('المستخدم مسجل الدخول:', user);
    } else {
      console.log('المستخدم غير مسجل الدخول');
    }
  });
  
  return unsubscribe; // تنظيف عند إلغاء المكون
}, []);
```

## قاعدة البيانات (Firestore)

### إضافة بيانات جديدة
```javascript
import { createDocument } from './Firebase/Firebase';

// إضافة منتج جديد
const addProduct = async () => {
  const productData = {
    name: 'هاتف ذكي',
    price: 1500,
    category: 'إلكترونيات',
    createdAt: new Date()
  };
  
  const result = await createDocument('Products', productData);
  if (result.success) {
    console.log('تم إضافة المنتج بـ ID:', result.id);
  }
};
```

### إضافة بيانات بـ ID محدد
```javascript
import { createDocumentWithId } from './Firebase/Firebase';

const addUserProfile = async (userId) => {
  const userData = {
    name: 'أحمد علي',
    age: 25,
    city: 'الرياض'
  };
  
  const result = await createDocumentWithId('UserProfiles', userId, userData);
  if (result.success) {
    console.log('تم حفظ البروفايل');
  }
};
```

### جلب بيانات مستند واحد
```javascript
import { getDocument } from './Firebase/Firebase';

const getProductDetails = async (productId) => {
  const result = await getDocument('Products', productId);
  if (result.success) {
    console.log('بيانات المنتج:', result.data);
  } else {
    console.log('المنتج غير موجود');
  }
};
```

### جلب مجموعة من البيانات
```javascript
import { getCollection } from './Firebase/Firebase';

// جلب جميع المنتجات
const getAllProducts = async () => {
  const result = await getCollection('Products');
  if (result.success) {
    console.log('المنتجات:', result.data);
  }
};
```

### جلب البيانات مع شروط
```javascript
import { getCollection, createQuery, createOrderBy, createLimit } from './Firebase/Firebase';

// جلب المنتجات الإلكترونية مرتبة حسب السعر (أول 10)
const getElectronics = async () => {
  const conditions = [
    createQuery('category', '==', 'إلكترونيات'),
    createOrderBy('price', 'asc'),
    createLimit(10)
  ];
  
  const result = await getCollection('Products', conditions);
  if (result.success) {
    console.log('المنتجات الإلكترونية:', result.data);
  }
};
```

### تحديث البيانات
```javascript
import { updateDocument } from './Firebase/Firebase';

const updateProductPrice = async (productId) => {
  const updates = {
    price: 1200,
    updatedAt: new Date()
  };
  
  const result = await updateDocument('Products', productId, updates);
  if (result.success) {
    console.log('تم تحديث السعر');
  }
};
```

### حذف البيانات
```javascript
import { deleteDocument } from './Firebase/Firebase';

const deleteProduct = async (productId) => {
  const result = await deleteDocument('Products', productId);
  if (result.success) {
    console.log('تم حذف المنتج');
  }
};
```

## تخزين الملفات (Storage)

### رفع صورة
```javascript
import { uploadFile } from './Firebase/Firebase';

const uploadProductImage = async (imageFile, productId) => {
  const imagePath = `products/${productId}/main.jpg`;
  
  const result = await uploadFile(imageFile, imagePath);
  if (result.success) {
    console.log('رابط الصورة:', result.url);
    // يمكنك حفظ الرابط في قاعدة البيانات
  }
};
```

## إنشاء طلب من السلة (Orders)

### طلب الدفع عند الاستلام (Cash on Delivery)
```javascript
import { placeOrderFromCart, SHIPPING_FEE } from './Firebase/Firebase';

const placeCashOrder = async (selectedAddress) => {
  const result = await placeOrderFromCart({
    paymentMethod: 'CASH',
    addressSnapshot: selectedAddress,
    shippingFee: SHIPPING_FEE
  });
  if (result.success) {
    console.log('تم إنشاء الطلب بنجاح', result.total);
  } else {
    console.log('خطأ:', result.error);
  }
};
```

### طلب ببطاقة (Card)
```javascript
import { placeOrderFromCart, SHIPPING_FEE } from './Firebase/Firebase';

const placeCardOrder = async (selectedAddress) => {
  const result = await placeOrderFromCart({
    paymentMethod: 'CARD',
    addressSnapshot: selectedAddress,
    shippingFee: SHIPPING_FEE
  });
  // نجاح/فشل كما سبق
};
```

### طلب بمحفظة (Wallet)
```javascript
import { placeOrderFromCart, SHIPPING_FEE } from './Firebase/Firebase';

const placeWalletOrder = async (selectedAddress, phone) => {
  const result = await placeOrderFromCart({
    paymentMethod: 'WALLET',
    addressSnapshot: selectedAddress,
    walletPhone: phone,
    shippingFee: SHIPPING_FEE
  });
  // نجاح/فشل كما سبق
};
```

> ملاحظات:
> - الدالة placeOrderFromCart تقوم بإنشاء الطلب داخل Users.Orders ثم تفريغ عربة المستخدم تلقائياً.
> - يتم حساب المجموع الفرعي والنهائي داخلياً.
> - مرر shippingFee إلى placeOrderFromCart من واجهتك لضمان المطابقة بين المعروض والمحفوظ.
> - يمكن استخدام SHIPPING_FEE كقيمة افتراضية في الواجهة.

## أمثلة عملية للاستخدام في React

### مكون تسجيل الدخول
```javascript
import React, { useState } from 'react';
import { signIn } from './Firebase/Firebase';

const LoginComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signIn(email, password);
    if (result.success) {
      alert('تم تسجيل الدخول بنجاح');
    } else {
      alert('خطأ: ' + result.error);
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="البريد الإلكتروني"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="كلمة المرور"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'جاري التحميل...' : 'تسجيل الدخول'}
      </button>
    </form>
  );
};
```

### مكون عرض المنتجات
```javascript
import React, { useState, useEffect } from 'react';
import { getCollection } from './Firebase/Firebase';

const ProductsList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const result = await getCollection('Products');
      if (result.success) {
        setProducts(result.data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div>
      <h2>المنتجات</h2>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>السعر: {product.price} ريال</p>
        </div>
      ))}
    </div>
  );
};
```

## نصائح مهمة

1. **معالجة الأخطاء**: تأكد دائماً من فحص `result.success` قبل استخدام البيانات
2. **الأمان**: لا تضع كلمات مرور أو بيانات حساسة في الكود
3. **التحميل**: استخدم حالة `loading` لتحسين تجربة المستخدم
4. **التنظيف**: استخدم `unsubscribe` لإلغاء المراقبين عند إلغاء المكونات
5. **التحديث المباشر**: استخدم `onAuthStateChange` لمراقبة حالة المصادقة

## استيراد سريع لجميع الوظائف
```javascript
import {
  // المصادقة
  signIn, signUp, signOut, resetPassword, updateUserProfile, onAuthStateChange,
  
  // قاعدة البيانات
  createDocument, createDocumentWithId, getDocument, getCollection,
  updateDocument, deleteDocument,
  
  // الاستعلامات
  createQuery, createOrderBy, createLimit,
  
  // التخزين
  uploadFile,

  // الطلبات
  placeOrderFromCart, SHIPPING_FEE,
  
  // البيانات الأساسية
  auth, db, storage
} from './Firebase/Firebase';
```
