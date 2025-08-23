# MoneyMove 머니무브 분석기

이 크롬 확장 프로그램은 MoneyMove 머니무브 투자 플랫폼의 연체 페이지에서 투자 데이터를 자동으로 계산하고 시각화합니다.
투자 현황을 직관적으로 확인하고, 월별 데이터까지 추적할 수 있어 투자 분석에 활용할 수 있습니다.

## 주요 화면

<p align="center">
  <img src="https://raw.githubusercontent.com/verlane/moneymove-analyzer/refs/heads/main/assets/demo-1.png" alt="데모 1" width="45%"/>
  <img src="https://raw.githubusercontent.com/verlane/moneymove-analyzer/refs/heads/main/assets/demo-2.png" alt="데모 2" width="45%"/>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/verlane/moneymove-analyzer/refs/heads/main/assets/demo-3.png" alt="데모 3" width="45%"/>
  <img src="https://raw.githubusercontent.com/verlane/moneymove-analyzer/refs/heads/main/assets/demo-4.png" alt="데모 4" width="45%"/>
</p>

## 주요 기능

### 실시간 연체 분석
- **연체율**: 연체금액 ÷ 상환예정원금 × 100  
- **연체 비중**: 연체투자금 ÷ 상환예정원금 × 100  
- **회수율**: 지급금액 ÷ 연체투자금 × 100  
- **손실회복기간**: 리스크조정수익률을 기준으로 계산  
- **순수익**: 누적수익 - 연체금액  

### 자동 데이터 수집
- 메인 페이지에서 투자 데이터 자동 수집  
- 연체 페이지의 "더보기" 버튼을 자동으로 클릭  
- 모든 연체 데이터를 한 번에 로드  

### 시각화 기능
- 6종류의 차트 제공: 연체율, 연체금액, 순수익, 손실회복기간, 리스크조정수익률, 종합 대시보드  
- Chart.js 기반 인터랙티브 차트 지원  
- 반응형 레이아웃: 화면 크기에 따라 자동으로 3열 → 2열 → 1열 조정  

### 데이터 관리
- Chrome Storage를 활용한 안전한 로컬 저장  
- 월별 자동 추적 및 추이 분석  
- 수동 데이터 추가 가능 (덮어쓰기 전 확인창 제공)  
- JSON 파일로 데이터 백업 및 복원  
- 테스트용 12개월 샘플 데이터 제공  
- 개발자 모드에서 고급 기능 및 디버깅 지원  

## 설치 방법

### Chrome Web Store (추천)
1. [Chrome Web Store](https://chromewebstore.google.com/detail/moneymove-%EB%A8%B8%EB%8B%88%EB%AC%B4%EB%B8%8C-%EB%B6%84%EC%84%9D%EA%B8%B0/onbmacfaeaceopopjlgkjeonglakljmb?hl=ko)에서 "MoneyMove 머니무브 분석기" 페이지에 접속  
2. "Chrome에 추가" 버튼 클릭  

### 개발자 모드 (수동 설치)
1. 저장소를 다운로드하거나 복제  
   ```bash
   git clone https://github.com/verlane/moneymove-analyzer.git
   ```
2. Chrome에서 `chrome://extensions/` 접속  
3. 우측 상단의 "개발자 모드" 활성화  
4. "압축해제된 확장 프로그램을 로드합니다" 클릭  
5. 저장소 내 `extension` 폴더 선택  

## 사용법

### 기본 사용
1. MoneyMove 연체 페이지 접속:  
   `https://www.moneymove.ai/invest/my-page/bond/overdue`  
2. 확장 프로그램이 자동으로 분석 시작  
3. 로딩 완료 후 연체 현황 박스에서 결과 확인  

### 차트 보기
- "차트보기" 버튼 클릭  
- 6종 차트로 월별 투자 추이 확인  
- 마우스를 올리면 상세 데이터 확인 가능  

### 데이터 관리
- "데이터관리" 버튼 클릭  
- 저장된 월별 데이터 조회·편집·삭제  
- 수동 데이터 추가 및 테스트 데이터 생성  
- JSON 파일로 내보내기 가능  

### 설정
- 확장 프로그램 아이콘 클릭 후 팝업에서 제어  
- 연체 상세 정보 표시 여부 ON/OFF 가능  

## 기술 스택

- Manifest V3 기반 최신 Chrome Extension API  
- 모듈화 구조: Calculator, DataManager, ChartManager, UIComponents  
- 순수 JavaScript로 구현  
- Chart.js로 데이터 시각화  
- CSS3 기반 스타일 및 애니메이션  
- Chrome Storage API 활용  

## 프로젝트 구조

```
extension/
├── manifest.json         # 확장 프로그램 설정
├── content.js            # 메인 스크립트
├── popup.html/js         # 설정 팝업 UI
├── styles.css            # 전체 스타일시트
├── modules/              # 기능별 모듈
│   ├── calculator.js     # 투자 지표 계산 로직
│   ├── data-manager.js   # 데이터 저장/관리
│   ├── chart-manager.js  # 차트 생성/표시
│   └── ui-components.js  # UI 컴포넌트 관리
└── chart.min.js          # Chart.js 라이브러리
```

## 주요 계산 공식

### 연체율
```
연체율 = (총투자금액 - 총지급금액) ÷ 상환예정원금 × 100
```

### 손실회복기간
```
실제월수익 = (상환예정원금 × 리스크조정수익률 ÷ 12) × (1 - 16.4%)
손실회복기간 = 연체금액 ÷ 실제월수익 (개월)
```
*리스크조정수익률: 연체비율을 고려한 실제 수익률*  
*세금 및 수수료: 16.4% (세금 15.4% + 플랫폼 이용료 1%)*  

### 순수익
```
순수익 = 누적수익액 - 연체금액
```

## 보안 및 개인정보

- 모든 데이터는 로컬 브라우저에만 저장  
- 외부 서버로 데이터 전송 없음  
- MoneyMove 도메인에서만 동작  
- Chrome Storage API로 안전한 데이터 관리  
- 쿠키 데이터를 Chrome Storage로 자동 마이그레이션  

## 버전 히스토리

### v0.0.2 (2025-08-22)
- 코드 모듈화: content.js를 4개 모듈로 분리  
- 차트 모달 확장 및 3열 그리드 표시  
- 데이터 덮어쓰기 시 확인창 추가  
- UI/UX 개선 및 반응형 레이아웃 최적화  
- 성능 최적화 (무한 루프 방지, 디바운싱 적용)  
- 팝업에서 ON/OFF 기능 정상화  
- Chrome Storage API 적용 및 데이터 이전  

### v0.0.1 (2025-08-21)
- 초기 버전 출시  
- 연체율, 연체금액, 순수익 등 기본 분석 기능 제공  
- 6종 차트 시각화  
- 월별 데이터 관리 기능  
- 확장 프로그램 ON/OFF 설정 가능  

## 기여하기

1. 저장소를 Fork  
2. 기능 브랜치 생성: `git checkout -b feature/new`  
3. 변경사항 커밋: `git commit -m '새 기능 추가'`  
4. 브랜치에 Push: `git push origin feature/new`  
5. Pull Request 생성  

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.  

## 주의사항

- 이 확장 프로그램은 **비공식 도구**입니다  
- MoneyMove와 공식적인 관련이 없습니다  
- 모든 투자 판단은 사용자 본인의 책임입니다  
- 제공되는 데이터는 참고용일 뿐입니다  

## 문의 및 지원

- 버그 신고: [GitHub Issues](https://github.com/verlane/moneymove-analyzer/issues)  
- 기능 제안: [GitHub Discussions](https://github.com/verlane/moneymove-analyzer/discussions)  
- 일반 문의: Repository의 Issues 탭 활용  
