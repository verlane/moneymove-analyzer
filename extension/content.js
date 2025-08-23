// content-new.js - 리팩토링된 메인 스크립트

(function() {
    'use strict';

    // 전역 변수들
    let EXPECTED_REPAYMENT_PRINCIPAL = null;
    let EXPECTED_YIELD = null; 
    let CUMULATIVE_PROFIT = null;

    // 모듈 인스턴스들
    let calculator = null;
    let dataManager = null;
    let chartManager = null;
    let uiComponents = null;

    // 초기화
    function init() {
        // 모듈들이 로드될 때까지 대기
        if (typeof Calculator === 'undefined' || 
            typeof DataManager === 'undefined' || 
            typeof ChartManager === 'undefined' || 
            typeof UIComponents === 'undefined') {
            setTimeout(init, 100);
            return;
        }

        // 모듈 인스턴스 생성
        calculator = new Calculator();
        dataManager = new DataManager();
        chartManager = new ChartManager();
        uiComponents = new UIComponents();

        // UI 컴포넌트 초기화
        uiComponents.init();

        // Storage API 헬퍼 함수들을 전역으로 등록
        setupStorageHelpers();

        // 메인 로직 실행
        startAnalysis();
    }

    // Storage API 헬퍼 함수들
    function setupStorageHelpers() {
        window.getStorageData = async function(key) {
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => {
                    resolve(result[key]);
                });
            });
        };

        window.setStorageData = async function(key, value) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => {
                    resolve();
                });
            });
        };
    }

    // 확장 프로그램 활성화 상태 확인
    async function isExtensionEnabled() {
        try {
            const result = await chrome.storage.sync.get(['moneyMoveExtensionEnabled']);
            return result.moneyMoveExtensionEnabled !== false; // 기본값 true
        } catch (error) {
            console.error('설정 확인 실패:', error);
            return true; // 기본값
        }
    }

    // 메인 분석 로직
    async function startAnalysis() {
        try {
            // 확장 프로그램 활성화 상태 확인
            const enabled = await isExtensionEnabled();
            if (!enabled) {
                console.log('🚫 MoneyMove 분석기가 비활성화되었습니다.');
                return;
            }

            // 로딩 상태 표시
            uiComponents.showLoadingStatus();

            // 메인페이지 데이터 로드
            await loadMainPageData();

            // 페이지 감시 및 데이터 수집 시작
            startPageMonitoring();

        } catch (error) {
            console.error('💥 MoneyMove 분석기 오류:', error);
            uiComponents.hideLoadingStatus();
            uiComponents.showNotification('분석 중 오류가 발생했습니다: ' + error.message, 'error');
        }
    }

    // 메인페이지 데이터 로드
    async function loadMainPageData() {
        const data = await loadDataFromCookies();
        
        EXPECTED_REPAYMENT_PRINCIPAL = data.expectedRepaymentPrincipal;
        EXPECTED_YIELD = data.expectedYield;
        CUMULATIVE_PROFIT = data.cumulativeProfit;

    }

    // 쿠키에서 데이터 로드 (기존 로직 유지)
    async function loadDataFromCookies() {
        // Storage에서 먼저 확인
        let expectedRepaymentPrincipal = await window.getStorageData('expectedRepaymentPrincipal');
        let expectedYield = await window.getStorageData('expectedYield');
        let cumulativeProfit = await window.getStorageData('cumulativeProfit');

        // Storage에 데이터가 없으면 쿠키에서 마이그레이션
        if (!expectedRepaymentPrincipal && !expectedYield && !cumulativeProfit) {
            const cookieData = migrateCookieData();
            expectedRepaymentPrincipal = cookieData.expectedRepaymentPrincipal;
            expectedYield = cookieData.expectedYield;
            cumulativeProfit = cookieData.cumulativeProfit;
        }

        return {
            expectedRepaymentPrincipal: expectedRepaymentPrincipal ? parseInt(expectedRepaymentPrincipal) : null,
            expectedYield: expectedYield ? parseFloat(expectedYield) : null,
            cumulativeProfit: cumulativeProfit ? parseInt(cumulativeProfit) : null
        };
    }

    // 쿠키 데이터 마이그레이션
    function migrateCookieData() {
        const cookies = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });

        const expectedRepaymentPrincipal = cookies['moneyMoveExpectedRepaymentPrincipal'];
        const expectedYield = cookies['moneyMoveExpectedYield'];
        const cumulativeProfit = cookies['moneyMoveCumulativeProfit'];

        // Storage로 마이그레이션
        if (expectedRepaymentPrincipal) {
            window.setStorageData('expectedRepaymentPrincipal', expectedRepaymentPrincipal);
        }
        if (expectedYield) {
            window.setStorageData('expectedYield', expectedYield);
        }
        if (cumulativeProfit) {
            window.setStorageData('cumulativeProfit', cumulativeProfit);
        }

        return {
            expectedRepaymentPrincipal: expectedRepaymentPrincipal ? parseInt(expectedRepaymentPrincipal) : null,
            expectedYield: expectedYield ? parseFloat(expectedYield) : null,
            cumulativeProfit: cumulativeProfit ? parseInt(cumulativeProfit) : null
        };
    }

    // 페이지 감시 시작
    function startPageMonitoring() {
        let isProcessing = false;
        let lastProcessTime = 0;
        
        // 즉시 한 번 실행
        setTimeout(processCurrentData, 1000);

        // 페이지 변화 감시 (디바운싱 적용)
        const observer = new MutationObserver((mutations) => {
            // 이미 처리 중이거나 최근에 처리했으면 스킵
            if (isProcessing || Date.now() - lastProcessTime < 3000) {
                return;
            }
            
            let shouldProcess = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 우리가 만든 요소들은 제외
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (!node.classList || 
                                (!node.classList.contains('mm-summary') && 
                                 !node.classList.contains('mm-loading') && 
                                 !node.classList.contains('mm-modal-overlay'))) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
            });

            if (shouldProcess) {
                isProcessing = true;
                setTimeout(() => {
                    processCurrentData().finally(() => {
                        isProcessing = false;
                        lastProcessTime = Date.now();
                    });
                }, 500);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 자동 "더보기" 클릭
        setTimeout(autoClickLoadMore, 2000);
    }

    // 자동 "더보기" 클릭
    function autoClickLoadMore() {
        const loadMoreButtons = document.querySelectorAll('button');
        loadMoreButtons.forEach(button => {
            if (button.textContent.trim() === '더보기') {
                button.click();
                setTimeout(autoClickLoadMore, 1000);
            }
        });
    }

    // 현재 데이터 처리
    async function processCurrentData() {
        try {
            // 기존 요약 박스 제거
            uiComponents.removeSummaryBox();

            // 계산 실행
            const metrics = calculator.calculateAllMetrics(
                EXPECTED_REPAYMENT_PRINCIPAL,
                EXPECTED_YIELD,
                CUMULATIVE_PROFIT
            );

            // 추가 필요한 데이터
            metrics.expectedRepaymentPrincipal = EXPECTED_REPAYMENT_PRINCIPAL;
            metrics.expectedYield = EXPECTED_YIELD;
            metrics.cumulativeProfit = CUMULATIVE_PROFIT;

            // 현재 월의 최소/최대값 가져오기
            const monthMinMax = await getCurrentMonthMinMax();

            // 요약 박스 생성 및 추가
            const summaryElement = uiComponents.createSummaryBox(metrics, monthMinMax);
            uiComponents.addSummaryToPage(summaryElement);

            // 이벤트 리스너 설정
            uiComponents.setupSummaryEventListeners(chartManager, dataManager);
            uiComponents.setupTooltipEvents();

            // 월별 데이터 저장
            await dataManager.saveMonthlyData(
                parseFloat(metrics.overdueRate) || 0,
                metrics.overdueAmount,
                metrics.netProfit,
                EXPECTED_REPAYMENT_PRINCIPAL,
                metrics.monthsToRecoverLoss,
                parseFloat(metrics.riskAdjustedReturn) || 0
            );

            // 로딩 상태 숨기기
            uiComponents.hideLoadingStatus();


        } catch (error) {
            console.error('❌ 데이터 처리 오류:', error);
            uiComponents.hideLoadingStatus();
            uiComponents.showNotification('데이터 처리 중 오류가 발생했습니다.', 'error');
        }
    }

    // 현재 월의 최소/최대값 가져오기
    async function getCurrentMonthMinMax() {
        const currentDate = new Date();
        const currentMonthKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
        
        const monthlyDataString = await window.getStorageData('moneyMoveMonthlyData');
        const allMonthlyData = monthlyDataString ? JSON.parse(monthlyDataString) : {};
        const currentMonthData = allMonthlyData[currentMonthKey];
        
        if (currentMonthData) {
            return `(월 최소 <span class="text-success">${currentMonthData.overdueRateMin.toFixed(2)}%</span> / 최대 <span class="text-warning">${currentMonthData.overdueRateMax.toFixed(2)}%</span>)`;
        }
        
        return '';
    }

    // 전역 함수들 (호환성 유지)
    window.getMonthlyData = async function() {
        return await dataManager.getMonthlyData();
    };

    window.showDataManager = async function() {
        return await dataManager.showDataManager();
    };

    // 에러 핸들링
    window.addEventListener('error', (event) => {
        console.error('💥 MoneyMove 분석기 전역 오류:', event.error);
    });

    // 시작
    init();

})();