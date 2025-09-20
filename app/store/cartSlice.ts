// store/cartSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Product {
  id: number;
  name: string;
  originalPrice: number;
  discountRate: number;
  salePrice: number;
  image: string;
  description: string;
}

interface CartItem extends Product {
  quantity: number;
  addedAt: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
}

const initialState: CartState = {
  items: [],
  loading: false,
};

// 장바구니 로드
export const loadCartFromStorage = createAsyncThunk(
  'cart/loadFromStorage',
  async () => {
    const cartData = await AsyncStorage.getItem('cartItems');
    return cartData ? JSON.parse(cartData) : [];
  }
);

// 장바구니 저장
export const saveCartToStorage = createAsyncThunk(
  'cart/saveToStorage',
  async (items: CartItem[]) => {
    await AsyncStorage.setItem('cartItems', JSON.stringify(items));
    return items;
  }
);

// 장바구니 전체 삭제
export const clearCartStorage = createAsyncThunk(
  'cart/clearStorage',
  async () => {
    await AsyncStorage.removeItem('cartItems');
    return [];
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Product>) => {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.addedAt = new Date().toISOString();
      } else {
        const newItem: CartItem = {
          ...action.payload,
          quantity: 1,
          addedAt: new Date().toISOString()
        };
        state.items.push(newItem);
      }
    },
    increaseQuantity: (state, action: PayloadAction<number>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) {
        item.quantity += 1;
      }
    },
    decreaseQuantity: (state, action: PayloadAction<number>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCartFromStorage.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadCartFromStorage.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(saveCartToStorage.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(clearCartStorage.fulfilled, (state) => {
        state.items = [];
      });
  },
});

export const { addToCart, increaseQuantity, decreaseQuantity, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
