# دليل استخدام Firebase - شرح مبسط

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
  
  // البيانات الأساسية
  auth, db, storage
} from './Firebase/Firebase';
```
