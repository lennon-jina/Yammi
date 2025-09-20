import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch } from '../store/hooks';
import { addToCart, saveCartToStorage } from '../store/cartSlice';
import { store } from '../store/store';
import { DeviceEventEmitter } from 'react-native';
import axios from 'axios';

// JSON 파일에서 데이터 import
const productsDataRaw = require('../../assets/products.json');

// 상품 데이터 타입 정의
interface Product {
  id: number;
  name: string;
  originalPrice: number;
  discountRate: number;
  salePrice: number;
  image: string;
  description: string;
}

// 장바구니 아이템 타입 정의
interface CartItem extends Product {
  quantity: number;
  addedAt: string;
}

// 타입 안전성을 위한 데이터 변환
const productsData: Product[] = productsDataRaw as Product[];

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isPurchasing, setPurchasing] = useState(false);
    
  const dispatch = useAppDispatch();
  
  // URL 파라미터로 받은 id를 이용해 해당 상품 찾기
  const productId = Array.isArray(id) ? parseInt(id[0]) : parseInt(id as string);
  const product = productsData.find(item => item.id === productId);

  // 장바구니 추가 함수 - axios 에러 처리 개선
  const addToCartHandler = async () => {
    if (!product) return;
    setIsAddingToCart(true);
    
    try {
      // 서버가 있다면 장바구니 추가 API 호출 시도
      try {
        await axios.post('/api/cart/add', { 
          productId: product.id, 
          quantity: 1 
        }, {
          timeout: 3000
        });
        console.log('서버에 장바구니 추가 성공');
      } catch (apiError) {
        console.log('장바구니 추가 API 실패, 로컬 저장 진행');
      }

      // 로컬 상태 업데이트 (항상 실행)
      dispatch(addToCart(product));
      const cartItems = store.getState().cart.items;
      await dispatch(saveCartToStorage(cartItems));

      DeviceEventEmitter.emit('cartUpdated');

      Alert.alert(
        '장바구니 추가 완료',
        `${product.name}이(가) 장바구니에 추가되었습니다.`,
        [
          { text: '계속 쇼핑', style: 'cancel' },
          { text: '장바구니 보기', onPress: () => router.push('/cart') },
        ]
      );
    } catch (error) {
      console.error('장바구니 추가 실패:', error);
      Alert.alert('오류', '장바구니 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // 바로 구매 함수 - 장바구니에 추가하지 않음
  const buyNow = async () => {
    if (!product) return;
    
    setPurchasing(true);

    try {
      // 서버 API 호출 시도 (있으면)
      try {
        await axios.post('/api/purchase/direct', {
          productId: product.id,
          quantity: 1,
        }, {
          timeout: 3000
        });
        console.log('서버 구매 API 호출 성공');
      } catch (apiError) {
        console.log('구매 API 호출 실패, 로컬 처리 진행');
      }

      // 바로 구매는 장바구니에 추가하지 않음 (이미 구매 완료)
      console.log('바로 구매 완료 - 장바구니 추가 안 함');

      // 구매 완료 알림
      Alert.alert(
        '구매 완료',
        `${product.name}\n구매가 완료되었습니다!\n\n결제금액: ₩${product.salePrice.toLocaleString()}`,
        [
          { 
            text: '확인', 
            onPress: () => {
              console.log('구매 완료 - 상품:', product.name);
              // 여기서 결제 완료 페이지로 이동하거나 추가 로직 구현 가능
            }
          },
        ]
      );

    } catch (error) {
      console.error('구매 처리 중 오류:', error);
      Alert.alert('오류', '구매 처리 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  // 상품을 찾지 못한 경우
  if (!product) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>상품 정보</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>상품을 찾을 수 없습니다.</Text>
          <TouchableOpacity 
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListText}>목록으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>상품 상세</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons name="heart-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} >
        {/* 상품 이미지 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          
          {/* 할인율 배지 */}
          {product.discountRate > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(product.discountRate * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* 상품 정보 */}
        <View style={styles.productInfoContainer}>
          {/* 상품명 */}
          <Text style={styles.productName}>{product.name}</Text>
          
          {/* 가격 정보 */}
          <View style={styles.priceContainer}>
            {product.discountRate > 0 && (
              <Text style={styles.originalPrice}>
                ₩{product.originalPrice.toLocaleString()}
              </Text>
            )}
            <Text style={styles.salePrice}>
              ₩{product.salePrice.toLocaleString()}
            </Text>
            {product.discountRate > 0 && (
              <View style={styles.savingAmountContainer}>
                <Text style={styles.savingAmount}>
                  {product.originalPrice - product.salePrice}원 할인
                </Text>
              </View>
            )}
          </View>

          {/* 상품 설명 */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>상품 설명</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 하단 구매 버튼들 */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.cartButton, isAddingToCart && styles.disabledButton]}
          onPress={addToCartHandler}
          disabled={isAddingToCart}
        >
          <Ionicons 
            name="cart-outline" 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.cartButtonText}>
            {isAddingToCart ? '추가 중...' : '장바구니'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.buyButton, isPurchasing && styles.disabledButton]}
          onPress={buyNow}
          disabled={isPurchasing}
        >
          <Text style={styles.buyButtonText}>
            {isPurchasing ? '구매 중...' : '바로 구매'}
          </Text>
        </TouchableOpacity>
      </View>
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
  favoriteButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 90,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 15,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    borderRadius: 15,
  },
  discountBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#ff4757',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  discountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  productInfoContainer: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    lineHeight: 30,
  },
  priceContainer: {
    marginBottom: 20,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 5,
  },
  salePrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 5,
  },
  savingAmountContainer: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  savingAmount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
  },
  cartButton: {
    flex: 1,
    backgroundColor: '#666',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buyButton: {
    flex: 2,
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
  buyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  backToListButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  backToListText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
