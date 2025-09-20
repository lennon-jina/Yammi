import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
  // 하단 탭 네비게이터 제거: Stack만 사용
  return <Stack screenOptions={{ headerShown: false }} />;
}
