# 📱 프로젝트 이름
야미 장바구니 기능 만들기

---

## 🚀 로컬 실행 & 빌드 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 앱 실행
```bash
npx expo start
```
- QR 코드 스캔 → **Expo Go**에서 실행
- 또는 에뮬레이터/시뮬레이터에서 실행

### 3. 빌드 
```bash
eas build -p android --profile preview
```
> EAS 계정 로그인 필요

---

## 📂 폴더 구조
```plaintext
my-app/
├─ app/
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  └─ _layout.tsx
│  ├─ product/
│  │  └─ [id].tsx       # 상품 상세 화면
│  ├─ cart.tsx          # 장바구니 화면
│  ├─ index.tsx
│  ├─ modal.tsx
│  └─ products.tsx      # 제품 상세목록 화면
│
├─ store/
│  ├─ cartSlice.ts
│  ├─ hooks.ts
│  └─ store.ts
│
├─ assets/
│  ├─ images/
│  └─ products.json
│
├─ app.json
├─ eas.json
├─ package.json
└─ README.md
```

---

## 🛠 기술 스택
- **라우팅**: React Navigation (Expo Router)
- **상태 관리**: Redux (Redux Toolkit)
- **비동기**: Axios 
- **스타일**: StyleSheet.create
- **스토리지**: @react-native-async-storage/async-storage
---

## 🧠 기술적 의사결정 & 트레이드오프

## 문제
- 여러 화면에서 **장바구니/상품 데이터**를 일관되게 공유하고, 앱 재실행 시에도 **상태를 복원**할 필요가 있었음.

## 선택
- 전역 상태는 **Redux Toolkit**, 영속 저장은 **AsyncStorage**로 구성.
- 화면 전환은 **React Navigation**의 Stack 구조를 사용.

## 트레이드오프
- **장점**: 예측 가능한 전역 상태, 멀티 스크린 데이터 일관성, 재실행 시 복원 용이.
- **단점**: 초기 설정/보일러플레이트 증가, 학습 곡선 존재.
- **대안 고려**: Context만 사용할 경우 설정은 단순하지만, 상태 규모가 커질수록 관리 난이도 상승.

## 시행착오 & 개선
- 초기에는 **Recoil**로 상태 관리 시도  
- React 19 환경에서 호환성 문제로 빌드 오류 발생  
- **Redux Toolkit**으로 전환해 문제 해결 및 안정적인 전역 상태 관리 구현

---

## 🚧 미구현 기능 & 사유
- **음식 사진 데이터 정합성 개선**: 제공된 mock 데이터의 이미지 URL이 음식명과 일치하지 않아 Unsplash API로 검색 결과를 매칭하는 기능을 추가하려 했으나 시간 부족으로 미구현
- **iOS 빌드**: 맥북 OS 버전 문제로 iOS 시뮬레이터 및 빌드 테스트 불가

---

## ⏱ 소요 시간(예시)
- 환경 세팅 & 계획안 작성: 2h  
- Figma UI/UX 설계: 1h  
- 화면 구현: 2h  
- Mock data 블로우업 & Redux 스토어 설계: 5h  
- 상태 관리/스토리지 연동: 5h  
- 테스트 & 디버깅: 7h  
- 에러 처리 고도화 & UI 개선: 3h  
- README 작성 & apk 빌드: 1h  
- 영상 녹화 & 제출: 1h  

**총합: 약 27h**

---

## 개발 과정
- [x] 환경 세팅 & 계획안 작성 (2025-09-15)
- [x] Figma UI/UX 설계 (2025-09-15)
- [x] 화면 구현 (2025-09-16~17)
- [x] Mock data 블로우업 & Redux 스토어 설계 (2025-09-16~17)
- [x] 상태 관리/스토리지 연동 (2025-09-17)
- [x] 테스트 & 디버깅 (2025-09-16~19)
- [x] 에러 처리 고도화 (2025-09-19)
- [x] UI 디테일/애니메이션 개선 (2025-09-18)
- [x] README 작성 & apk 빌드 (2025-09-19~20)
- [x] 영상 녹화 & 제출 (2025-09-20)

