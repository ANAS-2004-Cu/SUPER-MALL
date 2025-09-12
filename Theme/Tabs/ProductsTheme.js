const lightTheme = {
  // Background colors
  backgroundColor: '#f5f5f5',
  cardBackground: '#fff',
  searchInputBackground: '#fff',
  filterButtonBackground: '#fff',
  priceContainerBackground: 'rgba(245, 245, 245, 0.5)',
  
  // Text colors
  headingColor: '#333',
  titleColor: '#222',
  priceColor: '#ff4757',
  originalPriceColor: '#888',
  addToCartTextColor: '#fff',
  quantityTextColor: '#fff',
  
  // Button colors
  filterButtonBorderColor: '#ddd',
  searchInputBorderColor: '#ddd',
  fullWidthButtonBackground: 'rgba(0,0,0,0.8)',
  quantityButtonBackground: 'rgba(255,255,255,0.2)',
  
  // Icons
  filterIconColor: '#333',
  favoriteIconInactiveColor: '#ddd',
  favoriteIconActiveColor: '#ff4757',
  cartIconColor: '#fff',
  
  // Discount badges
  discountBadgeBackground: '#ff4757',
  discountBadgeTextColor: 'white',
  
  // Shadows and elevations
  cardShadowColor: '#000',
  cardBorderColor: '#ddd',

  // Search input styles
  searchIconColor: '#888',
  searchInputTextColor: '#333',
  searchInputPlaceholderColor: '#aaa',
  searchInputShadowColor: 'rgba(0,0,0,0.1)',
};

const darkTheme = {
  // Background colors - تحسين التباين مع خلفيات مختلفة
  backgroundColor: '#121212',
  cardBackground: '#1e1e1e',
  searchInputBackground: '#2c2c2c',
  filterButtonBackground: '#2c2c2c',
  priceContainerBackground: 'rgba(55, 55, 55, 0.7)',
  
  // Text colors - زيادة التباين بألوان أفتح للنصوص
  headingColor: '#ffffff',
  titleColor: '#f0f0f0',
  priceColor: '#ff7a7a',  // لون أفتح للسعر
  originalPriceColor: '#b5b5b5',  // لون أفتح للسعر الأصلي
  addToCartTextColor: '#ffffff',
  quantityTextColor: '#ffffff',
  
  // Button colors - ألوان أكثر وضوحًا للأزرار
  filterButtonBorderColor: '#555',
  searchInputBorderColor: '#555',
  
  // تعديل زر Add to Cart ليكون أكثر انسجاماً وواضحاً في الوضع الداكن
  fullWidthButtonBackground: '#404040', // لون رمادي داكن يتناسب مع الواجهة ويوفر تباين جيد
  quantityButtonBackground: 'rgba(100, 100, 100, 0.7)',  // لون متناسب مع الزر الرئيسي
  
  // Icons - زيادة التباين بألوان أفتح للأيقونات
  filterIconColor: '#f0f0f0',
  favoriteIconInactiveColor: '#888',  // لون أفتح للقلب غير النشط
  favoriteIconActiveColor: '#ff7a7a',  // لون متناسق مع لون السعر
  cartIconColor: '#ffffff',
  
  // Discount badges - تعديل لون الخصم ليكون أكثر إشراقًا
  discountBadgeBackground: '#ff6b6b',
  discountBadgeTextColor: '#ffffff',
  
  // Shadows and elevations - تحسين وضوح الحدود
  cardShadowColor: '#000',
  cardBorderColor: '#444',  // حدود أوضح للبطاقات

  // Search input styles
  searchIconColor: '#b0b0b0',
  searchInputTextColor: '#f0f0f0',
  searchInputPlaceholderColor: '#888',
  searchInputShadowColor: 'rgba(0,0,0,0.3)',
};

export { darkTheme, lightTheme };

