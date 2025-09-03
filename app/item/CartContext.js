import React, { createContext, useState, useContext, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../Firebase/Firebase'; 

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState(null); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserEmail(user.email);
        try {
          const docRef = doc(db, 'carts', user.email);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCart(docSnap.data().items || []);
          } else {
            setCart([]); 
          }
        } catch (err) {
          setError('Failed to load cart'); 
        }
      } else {
        setUserEmail(null);
        setCart([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateCart = async (updatedCart) => {
    if (userEmail) {
      try {
        const cartRef = doc(db, 'carts', userEmail);
        await setDoc(cartRef, { items: updatedCart });
      } catch (err) {
        setError('Failed to save cart'); 
      }
    }
  };

  const addToCart = (item) => {
    const exists = cart.find(i => i.id === item.id);  
    
    let updatedCart;

    if (exists) {
        updatedCart = cart.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
    } else {
        updatedCart = [...cart, { ...item, quantity: 1 }];
    }

    setCart(updatedCart);  
    updateCart(updatedCart); 
};




  const removeFromCart = (id) => {
    const updatedCart = cart.filter(item => item.id !== id);
    setCart(updatedCart);
    updateCart(updatedCart); 
  };

  const updateQuantity = (id, quantity) => {
    const updatedCart = cart.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setCart(updatedCart);
    updateCart(updatedCart); 
  };

  const clearCart = () => {
    setCart([]);
    updateCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, loading, error }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);