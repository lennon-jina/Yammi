import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { loadCartFromStorage } from './store/cartSlice';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

// JSON 파일에서 데이터 import
const productsDataRaw = require('../assets/products.json');

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
interface CartItemLite {
  quantity: number;
}

// 타입 안전성을 위한 데이터 변환
const productsData: Product[] = productsDataRaw as Product[];

export default function ProductListScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const router = useRouter();
    
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(loadCartFromStorage());
      
      // 뒤로가기 버튼 처리
      const onBackPress = () => {
        Alert.alert(
          '앱 종료',
          '앱을 종료하시겠습니까?',
          [
            { text: '취소', style: 'cancel', onPress: () => null },
            { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
          ]
        );
        return true; // 기본 뒤로가기 동작 막기
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      
      return () => backHandler.remove();
    }, [dispatch])
  );
  
  const ITEMS_PER_PAGE = 10;

  // 컴포넌트 마운트 시 첫 10개 로드
  React.useEffect(() => {
    loadInitialProducts();
  }, []);

  // 첫 10개 상품 로드 - axios 에러 처리 개선
  const loadInitialProducts = async () => {
    try {
      // 서버 API 호출 시도 (실제 서버가 있을 때 사용)
      try {
        const response = await axios.get('/api/products', {
          params: { page: 0, limit: ITEMS_PER_PAGE },
          timeout: 3000, // 3초 타임아웃 설정
        });
        
        // 서버에서 데이터를 성공적으로 받아온 경우
        if (response.data && response.data.length > 0) {
          setProducts(response.data.slice(0, ITEMS_PER_PAGE));
          setCurrentPage(1);
          setHasMoreData(response.data.length > ITEMS_PER_PAGE);
          console.log('서버에서 상품 데이터 로드 성공');
          return;
        }
      } catch (apiError) {
        // API 에러는 무시하고 로컬 데이터 사용
        console.log('API 호출 실패, 로컬 데이터 사용:', apiError instanceof Error ? apiError.message : 'Unknown error');
      }

      // 로컬 데이터 사용 (기본 동작)
      if (productsData.length === 0) {
        console.log('상품 데이터가 없습니다!');
        return;
      }
      
      const firstPage = productsData.slice(0, ITEMS_PER_PAGE);
      setProducts(firstPage);
      setCurrentPage(1);
      setHasMoreData(productsData.length > ITEMS_PER_PAGE);
      console.log('로컬 데이터에서 상품 로드 성공:', firstPage.length, '개');
      
    } catch (error) {
      console.error('상품 로드 실패:', error);
    }
  };

  // 상품 클릭 시 상세 페이지로 이동
  const handleProductPress = (productId: number) => {
    router.push({ pathname: "/product/[id]", params: { id: String(productId) } });
  };

  // 새로고침 함수 - axios 에러 처리 개선
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 서버 동기화 시도
      try {
        await axios.get('/api/products/refresh', {
          timeout: 3000,
        });
        console.log('서버 동기화 성공');
      } catch (apiError) {
        console.log('서버 동기화 실패, 로컬 새로고침 진행');
      }
      
      // 로컬 데이터 새로고침
      await loadInitialProducts();
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 무한스크롤을 위한 더 많은 데이터 로드 - axios 에러 처리 개선
  const loadMoreProducts = async () => {
    if (loading || !hasMoreData) return;
    setLoading(true);
    
    try {
      // 서버 API 호출 시도
      try {
        const response = await axios.get('/api/products', {
          params: { page: currentPage, limit: ITEMS_PER_PAGE },
          timeout: 3000,
        });
        
        if (response.data && response.data.length > 0) {
          const newProducts = response.data.slice(
            currentPage * ITEMS_PER_PAGE, 
            (currentPage + 1) * ITEMS_PER_PAGE
          );
          setProducts(prev => [...prev, ...newProducts]);
          setCurrentPage(prev => prev + 1);
          setHasMoreData(response.data.length > (currentPage + 1) * ITEMS_PER_PAGE);
          console.log('서버에서 추가 상품 로드 성공');
          return;
        }
      } catch (apiError) {
        console.log('추가 상품 API 호출 실패, 로컬 데이터 사용');
      }

      // 로컬 데이터에서 추가 상품 로드
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const nextPageProducts = productsData.slice(startIndex, endIndex);
      
      if (nextPageProducts.length > 0) {
        setProducts(prev => [...prev, ...nextPageProducts]);
        setCurrentPage(prev => prev + 1);
        if (endIndex >= productsData.length) {
          setHasMoreData(false);
        }
        console.log('로컬에서 추가 상품 로드:', nextPageProducts.length, '개');
      } else {
        setHasMoreData(false);
        console.log('더 이상 로드할 상품이 없습니다');
      }
      
    } catch (error) {
      console.error('추가 상품 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 개별 상품 렌더링
  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      activeOpacity={0.8}
      onPress={() => handleProductPress(item.id)}
    >
      {/* 할인율 배지 */}
      {item.discountRate > 0 && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{Math.round(item.discountRate * 100)}%</Text>
        </View>
      )}
      
      {/* 상품 이미지 */}
      <Image source={{ uri: item.image }} style={styles.productImage} />
      
      {/* 상품 정보 */}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        
        {/* 가격 정보 */}
        <View style={styles.priceContainer}>
          {item.discountRate > 0 && (
            <Text style={styles.originalPrice}>
              ₩{item.originalPrice.toLocaleString()}
            </Text>
          )}
          <Text style={styles.discountPrice}>
            ₩{item.salePrice.toLocaleString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 헤더 컴포넌트
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.pageTitle}>상품 목록</Text>
      <View style={styles.cartContainer}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }} 
          onPress={() => router.push('/cart')}
        >
          <Text style={styles.headerTitle}>My Cart</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#4A90E2"
          />
        }
        onEndReached={hasMoreData ? loadMoreProducts : null}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => (
          loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>로딩 중...</Text>
            </View>
          ) : !hasMoreData ? (
            <View style={styles.endContainer}>
              <Text style={styles.endText}>모든 상품을 확인했습니다</Text>
            </View>
          ) : null
        )}
      />
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
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
  productList: {
    paddingHorizontal: 10,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    margin: 10,
    padding: 12,
    flex: 1,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff4757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 1,
  },
  discountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    lineHeight: 18,
  },
  priceContainer: {
    marginTop: 'auto',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  endContainer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  endText: {
    fontSize: 14,
    color: '#999',
  },
  cartBadge: {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#ff4757',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
});