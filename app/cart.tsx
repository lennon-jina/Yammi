import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { 
    loadCartFromStorage, 
   increaseQuantity, 
   decreaseQuantity, 
   removeFromCart, 
   clearCart,
   saveCartToStorage,
   clearCartStorage 
 } from './store/cartSlice';
import { store } from './store/store';
import { DeviceEventEmitter } from 'react-native';
import axios from 'axios';

// 장바구니 아이템 타입 정의
interface CartItem {
  id: number;
  name: string;
  originalPrice: number;
  discountRate: number;
  salePrice: number;
  image: string;
  description: string;
  quantity: number;
  addedAt: string;
}

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: cartItems, loading } = useAppSelector((state) => state.cart);
  const [refreshing, setRefreshing] = useState(false);
  

  // Redux: 화면에 포커스될 때마다 Redux 상태를 AsyncStorage에서 로드
    useFocusEffect(
        useCallback(() => {
            dispatch(loadCartFromStorage());
        }, [dispatch])
        );

  // 새로고침
  const onRefresh = useCallback(async () => {
   setRefreshing(true);
   try {
     // 서버가 있으면 동기화 API 호출(없어도 try/catch로 안전)
     await axios.get('/api/cart');
     await dispatch(loadCartFromStorage());
   } catch (e) {
     console.error('장바구니 새로고침 실패:', e);
   } finally {
     setRefreshing(false);
   }
 }, [dispatch]);

    // 수량 증가 (Redux)
    const increaseQuantityHandler = async (itemId: number) => {
   try {
     await axios.put(`/api/cart/item/${itemId}/increase`);
   } catch (e) {
     console.warn('수량 증가 API 실패(무시 가능):', e);
   }
   dispatch(increaseQuantity(itemId));
   const updated = store.getState().cart.items;
   dispatch(saveCartToStorage(updated));
   DeviceEventEmitter.emit('cartUpdated');
 };

    // 수량 감소 (Redux)
    const decreaseQuantityHandler = async (itemId: number) => {
   try {
     await axios.put(`/api/cart/item/${itemId}/decrease`);
   } catch (e) {
     console.warn('수량 감소 API 실패(무시 가능):', e);
   }
   dispatch(decreaseQuantity(itemId));
   const updated = store.getState().cart.items;
   dispatch(saveCartToStorage(updated));
   DeviceEventEmitter.emit('cartUpdated');
 };

    // 아이템 삭제 (Redux)
    const removeFromCartHandler = async (itemId: number) => {
    Alert.alert(
        '상품 삭제',
        '장바구니에서 이 상품을 삭제하시겠습니까?',
        [
        { text: '취소', style: 'cancel' },
        {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
            try {
             await axios.delete(`/api/cart/item/${itemId}`);
           } catch (e) {
             console.warn('상품 삭제 API 실패(무시 가능):', e);
           }
           dispatch(removeFromCart(itemId));
           const updated = store.getState().cart.items;
           dispatch(saveCartToStorage(updated));
           DeviceEventEmitter.emit('cartUpdated');
        },
        },
        ]
    );
    };

    // 전체 비우기 (Redux)
    const clearCartHandler = async () => {
    Alert.alert(
        '장바구니 비우기',
        '장바구니의 모든 상품을 삭제하시겠습니까?',
        [
        { text: '취소', style: 'cancel' },
        {
            text: '전체 삭제',
            style: 'destructive',
            onPress: async () => {
            try {
             await axios.delete('/api/cart/clear');
           } catch (e) {
             console.warn('전체 비우기 API 실패(무시 가능):', e);
           }
           dispatch(clearCart());
           dispatch(clearCartStorage()); // AsyncStorage 비우기
           DeviceEventEmitter.emit('cartUpdated');
            },
        },
        ]
    );
    };


  // 총 금액 계산
  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + (item.salePrice * item.quantity), 0);
  };

  // 총 상품 개수 계산
  const getTotalItemCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // 개별 장바구니 아이템 렌더링
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItemCard}>
      {/* 상품 이미지 */}
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      
      {/* 상품 정보 */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {/* 가격 정보 */}
        <View style={styles.priceContainer}>
          {item.discountRate > 0 && (
            <Text style={styles.originalPrice}>
              ₩{item.originalPrice.toLocaleString()}
            </Text>
          )}
          <Text style={styles.salePrice}>
            ₩{item.salePrice.toLocaleString()}
          </Text>
        </View>
        
        {/* 수량 조절 */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={[styles.quantityButton, item.quantity <= 1 && styles.disabledButton]}
            onPress={() => decreaseQuantityHandler(item.id)}
            disabled={item.quantity <= 1}
          >
            <Ionicons 
              name="remove" 
              size={18} 
              color={item.quantity <= 1 ? '#ccc' : '#666'} 
            />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => increaseQuantityHandler(item.id)}
          >
            <Ionicons name="add" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* 삭제 버튼 */}
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => removeFromCartHandler(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4757" />
      </TouchableOpacity>
    </View>
  );

  // 빈 장바구니 화면
  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>장바구니가 비어있어요</Text>
      <Text style={styles.emptySubtitle}>상품을 담아보세요!</Text>
      <TouchableOpacity 
        style={styles.shopButton}
        onPress={() => router.back()}
      >
        <Text style={styles.shopButtonText}>쇼핑 계속하기</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          장바구니 ({getTotalItemCount()})
        </Text>
        
        {cartItems.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={clearCartHandler}
          >
            <Text style={styles.clearButtonText}>전체삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 장바구니 아이템 리스트 */}
      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => `${item.id}-${item.addedAt}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor="#4A90E2"
              />
            }
          />
          
          {/* 하단 총액 및 주문 버튼 */}
          <View style={styles.bottomContainer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>총 결제금액</Text>
              <Text style={styles.totalPrice}>
                ₩{getTotalPrice().toLocaleString()}
              </Text>
            </View>
            
            <TouchableOpacity style={styles.orderButton}>
              <Text style={styles.orderButtonText}>
                주문하기 ({getTotalItemCount()}개)
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        renderEmptyCart()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  cartItemCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  priceContainer: {
    marginBottom: 10,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  disabledButton: {
    backgroundColor: '#f5f5f5',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  deleteButton: {
    padding: 10,
    marginLeft: 10,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A90E2',
  },
  orderButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  shopButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});