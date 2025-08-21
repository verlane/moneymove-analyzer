(function() {
    'use strict';

    // 확장 프로그램 활성화 상태 확인
    const EXTENSION_ENABLED_KEY = 'moneyMoveExtensionEnabled';
    
    async function checkExtensionEnabled() {
        try {
            const result = await chrome.storage.sync.get([EXTENSION_ENABLED_KEY]);
            return result[EXTENSION_ENABLED_KEY] !== false; // 기본값 true
        } catch (error) {
            console.error('확장 프로그램 상태 확인 실패:', error);
            return true; // 기본값
        }
    }
    
    // 확장 프로그램이 비활성화된 경우 실행 중단
    checkExtensionEnabled().then(enabled => {
        if (!enabled) {
            console.log('🚫 MoneyMove 분석기가 비활성화되었습니다.');
            return;
        }
        
        console.log('✅ MoneyMove 분석기가 활성화되었습니다.');
        // 기존 코드 실행
        initializeExtension();
    });
    
    function initializeExtension() {

    // 쿠키 헬퍼 함수들 (전역)
    window.setCookie = function(name, value, days = 30) {
            const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
        };

        window.getCookie = function(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) {
                try {
                    return decodeURIComponent(parts.pop().split(';').shift());
                } catch (e) {
                    return null;
                }
            }
            return null;
        };

        // 쿠키에서 데이터 가져오기
        let storedAmount = window.getCookie('expectedRepaymentPrincipal');
        let storedYield = window.getCookie('expectedYield');
        let storedProfit = window.getCookie('cumulativeProfit');

        // 월별 데이터도 쿠키에서 가져오기
        let monthlyData = window.getCookie('moneyMoveMonthlyData');
        let monthlyBackup = monthlyData ? JSON.parse(monthlyData) : {};

        // 동적으로 데이터 가져오기 함수들
        function getExpectedRepaymentPrincipal() {
            const value = window.getCookie('expectedRepaymentPrincipal');
            return value ? parseInt(value) : null;
        }

        function getExpectedYield() {
            const value = window.getCookie('expectedYield');
            return value ? parseFloat(value) : null;
        }

        function getCumulativeProfit() {
            const value = window.getCookie('cumulativeProfit');
            return value ? parseInt(value) : null;
        }

        // 초기 로딩 상태 표시
        function showLoadingStatus() {
            const titArea = document.querySelector('.tit-area');
            if (titArea) {
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'moneymove-loading';
                loadingDiv.style.cssText = `
                    margin: 20px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    font-size: 15px;
                    text-align: center;
                    color: #6c757d;
                `;
                loadingDiv.innerHTML = `
                    <div style="display: inline-flex; align-items: center; gap: 8px;">
                        <div style="width: 16px; height: 16px; border: 2px solid #dee2e6; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                        연체 데이터 분석 중... (더보기 버튼 자동 클릭 및 계산)
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `;
                titArea.insertAdjacentElement('afterend', loadingDiv);
            }
        }

        // 로딩 상태 제거
        function hideLoadingStatus() {
            const loadingDiv = document.getElementById('moneymove-loading');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }

        // 초기 로딩 표시
        showLoadingStatus();

        // 공통 메인페이지 데이터 가져오기 함수 (전역 접근 가능)
        window.fetchMainPageData = async function() {
            const response = await fetch('https://www.moneymove.ai/invest/my-page/main?type=main');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let savedData = {};

            // 데이터 추출
            const bondBoxes = doc.querySelectorAll('.bond-cnt__box');
            bondBoxes.forEach((box) => {
                const listItems = box.querySelectorAll('li');
                listItems.forEach((li) => {
                    const spanElement = li.querySelector('span');
                    const strongEm = li.querySelector('strong em');

                    if (spanElement && strongEm) {
                        const labelText = spanElement.textContent.trim();
                        const valueText = strongEm.textContent.trim().replace(/,/g, '');

                        if (labelText.includes('예상 수익률')) {
                            savedData.expectedYield = valueText;
                        } else if (labelText.includes('누적 수익액')) {
                            savedData.cumulativeProfit = valueText;
                        } else if (labelText.includes('상환 예정 원금')) {
                            savedData.expectedRepaymentPrincipal = valueText;
                        }
                    }
                });
            });

            // 데이터 저장 (쿠키로)
            if (savedData.expectedRepaymentPrincipal) {
                window.setCookie('expectedRepaymentPrincipal', savedData.expectedRepaymentPrincipal);
            }
            if (savedData.expectedYield) {
                window.setCookie('expectedYield', savedData.expectedYield);
            }
            if (savedData.cumulativeProfit) {
                window.setCookie('cumulativeProfit', savedData.cumulativeProfit);
            }

            return savedData;
        }

        // 백그라운드 메인페이지 데이터 업데이트 후 계산 시작 함수
        async function autoUpdateMainPageDataAndCalculate() {
            try {
                await window.fetchMainPageData();
                console.log('🔄 메인페이지 데이터 자동 업데이트 완료');

                // 메인페이지 데이터 업데이트 완료 후 계산 시작
                console.log('🚀 연체 데이터 계산 시작...');
                window.startCalculation = true; // 계산 시작 플래그

            } catch (error) {
                console.warn('⚠️ 메인페이지 데이터 자동 업데이트 실패:', error);
                // 업데이트 실패해도 계산은 시작
                window.startCalculation = true;
            }
        }

        // 페이지 로드시 자동으로 메인페이지 데이터 업데이트 후 계산 시작
        autoUpdateMainPageDataAndCalculate();

        // 연체 페이지에서 더보기 버튼이 있는 동안 계속 클릭 후 합계 표시
        let clickCount = 0;

        function clickMoreButton() {
            const moreButton = document.querySelector('.btn-basic.outline.xsmall.btn-basic-500[onclick="loadList();"]');
            const moreButtonContainer = document.querySelector('.table-list-more');

            // 더보기 버튼이 존재하고 보이는 상태인지 확인
            const isButtonVisible = moreButton && moreButtonContainer && 
                                  moreButtonContainer.style.display !== 'none' && 
                                  moreButton.offsetParent !== null;

            if (isButtonVisible) {
                moreButton.click();
                clickCount++;
                // 0.5초 후 다시 확인해서 더보기 버튼이 있으면 계속 클릭
                setTimeout(clickMoreButton, 500);
            } else {
                // 더보기 버튼이 없거나 숨겨졌으면 데이터 계산 시작
                setTimeout(calculateTotals, 500);
            }
        }


        // 월별 데이터 저장 함수
        function saveMonthlyData(overdueRate, overdueAmount, netProfit, monthsToRecoverLoss, riskAdjustedReturn) {
            const currentDate = new Date();
            const monthKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');

            // 기존 데이터 가져오기 (쿠키에서)
            const existingDataCookie = window.getCookie('moneyMoveMonthlyData');
            const existingData = existingDataCookie ? JSON.parse(existingDataCookie) : {};
            const beforeCount = Object.keys(existingData).length;

            // 메인페이지 데이터도 함께 백업
            const mainPageData = {
                expectedRepaymentPrincipal: window.getCookie('expectedRepaymentPrincipal'),
                expectedYield: window.getCookie('expectedYield'),
                cumulativeProfit: window.getCookie('cumulativeProfit')
            };

            // 현재 월 데이터 저장 (메인페이지 데이터 포함)
            existingData[monthKey] = {
                date: monthKey,
                overdueRate: parseFloat(overdueRate) || 0,
                overdueAmount: overdueAmount || 0,
                netProfit: netProfit || 0,
                monthsToRecoverLoss: monthsToRecoverLoss || 0,
                riskAdjustedReturn: parseFloat(riskAdjustedReturn) || 0,
                timestamp: Date.now(),
                saveLocation: window.location.hostname,
                userAgent: navigator.userAgent.substring(0, 50) + '...',
                // 메인페이지 백업 데이터
                backupData: mainPageData
            };

            try {
                // 쿠키에 저장
                const dataString = JSON.stringify(existingData);
                window.setCookie('moneyMoveMonthlyData', dataString);

                console.log(`💾 ${monthKey} 데이터 저장 완료 (${Object.keys(existingData).length}개월)`);

            } catch (error) {
                console.error(`❌ ${monthKey} 데이터 저장 중 오류:`, error);
            }
        }

        // 저장된 월별 데이터 가져오기 함수
        function getMonthlyData() {
            const savedDataCookie = window.getCookie('moneyMoveMonthlyData');
            const savedData = savedDataCookie ? JSON.parse(savedDataCookie) : {};
            const months = Object.keys(savedData).sort();

            if (months.length === 0) {
                return null;
            }

            // 최근 12개월 데이터만 사용
            const recentMonths = months.slice(-12);
            const monthlyData = {
                labels: recentMonths,
                overdueRate: [],
                overdueAmount: [],
                netProfit: [],
                recoveryMonths: [],
                riskAdjustedReturn: []
            };

            recentMonths.forEach(month => {
                const data = savedData[month];
                monthlyData.overdueRate.push(data.overdueRate);
                monthlyData.overdueAmount.push(data.overdueAmount);
                monthlyData.netProfit.push(data.netProfit);
                monthlyData.recoveryMonths.push(data.monthsToRecoverLoss);
                monthlyData.riskAdjustedReturn.push(data.riskAdjustedReturn);
            });

            return monthlyData;
        }


    function calculateTotals() {
            // 지급금액과 투자금액을 포함하는 모든 셀 찾기
            const amountCells = document.querySelectorAll('td.data-unit');

            let totalPayment = 0;
            let totalInvestment = 0;

            amountCells.forEach(cell => {
                const spans = cell.querySelectorAll('span.data-info');
                if (spans.length >= 2) {
                    // 첫 번째 span이 지급금액, 두 번째 span이 투자금액
                    const paymentSpan = spans[0].querySelector('span:not([class]):not([style])');
                    const investmentSpan = spans[1].querySelector('span:not([class]):not([style])');

                    if (paymentSpan) {
                        const paymentText = paymentSpan.textContent.trim().replace(/,/g, '');
                        if (!isNaN(paymentText) && paymentText !== '') {
                            totalPayment += parseInt(paymentText);
                        }
                    }

                    if (investmentSpan) {
                        const investmentText = investmentSpan.textContent.trim().replace(/,/g, '');
                        if (!isNaN(investmentText) && investmentText !== '') {
                            totalInvestment += parseInt(investmentText);
                        }
                    }
                }
            });

            // 연체 금액 계산 (연체 투자금 - 연체 지급금)
            const overdueAmount = totalInvestment - totalPayment;

            // 동적으로 데이터 가져오기
            const EXPECTED_REPAYMENT_PRINCIPAL = getExpectedRepaymentPrincipal();
            const EXPECTED_YIELD = getExpectedYield();
            const CUMULATIVE_PROFIT = getCumulativeProfit();

            // 연체율 계산 (연체금액 / 상환 예정 원금 * 100)
            const overdueRate = EXPECTED_REPAYMENT_PRINCIPAL ? (overdueAmount / EXPECTED_REPAYMENT_PRINCIPAL * 100).toFixed(2) : 'N/A';

            // 추가 유용한 정보 계산
            const normalInvestment = EXPECTED_REPAYMENT_PRINCIPAL ? EXPECTED_REPAYMENT_PRINCIPAL - totalInvestment : null; // 정상 투자금
            const totalReceivedAmount = totalPayment + (CUMULATIVE_PROFIT || 0); // 총 수취액 (지급금 + 누적수익)
            const overdueRatio = totalInvestment > 0 ? (totalInvestment / EXPECTED_REPAYMENT_PRINCIPAL * 100).toFixed(1) : null; // 연체 비중
            const paymentRatio = totalInvestment > 0 ? (totalPayment / totalInvestment * 100).toFixed(1) : null; // 연체 중 회수율

            // 연체금액과 누적수익 기반 추가 지표
            const lossRatio = CUMULATIVE_PROFIT && CUMULATIVE_PROFIT > 0 ? (overdueAmount / CUMULATIVE_PROFIT * 100).toFixed(1) : null; // 손실 비율 (연체금액 ÷ 누적수익)
            const netProfit = CUMULATIVE_PROFIT ? CUMULATIVE_PROFIT - overdueAmount : null; // 순수익 (누적수익 - 연체금액)
            const profitImpact = CUMULATIVE_PROFIT && CUMULATIVE_PROFIT > 0 ? (netProfit / CUMULATIVE_PROFIT * 100).toFixed(1) : null; // 수익 영향도
            const recoveryNeeded = overdueAmount > 0 ? ((overdueAmount / totalInvestment) * 100).toFixed(1) : null; // 회수 필요율

            // 예상수익률 기반 지표 (세금 15.4% + 플랫폼이용료 1% = 16.4% 차감)
            const taxAndFeeRate = 16.4; // 세금 15.4% + 플랫폼이용료 1%
            const riskAdjustedReturn = EXPECTED_YIELD && overdueRatio 
                ? (EXPECTED_YIELD * (1 - overdueRatio / 100)).toFixed(2) 
                : null; // 리스크 조정 수익률

            // 리스크조정수익률 기준으로 실제 월수익 계산
            const netMonthlyProfit = riskAdjustedReturn && EXPECTED_REPAYMENT_PRINCIPAL 
                ? ((EXPECTED_REPAYMENT_PRINCIPAL * parseFloat(riskAdjustedReturn) / 100) / 12) * (1 - taxAndFeeRate / 100)
                : null; // 리스크조정수익률 기준 세금 및 수수료 차감 후 실제 월수익
            const monthsToRecoverLoss = netMonthlyProfit && overdueAmount > 0 
                ? Math.ceil(overdueAmount / netMonthlyProfit) 
                : null; // 손실 회복 소요 개월수

            // 로딩 상태 제거
            hideLoadingStatus();

            // 현재 월 데이터 로컬스토리지에 저장
            saveMonthlyData(overdueRate, overdueAmount, netProfit, monthsToRecoverLoss, riskAdjustedReturn);

            // 기존 tit-area 찾기
            const titArea = document.querySelector('.tit-area');
            if (titArea) {
                // 심플한 연체 현황 박스 생성
                const summaryDiv = document.createElement('div');
                summaryDiv.style.cssText = `
                    margin: 20px 0;
                    padding: 15px;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                `;

                // 표시할 데이터 준비
                const dataNotAvailable = !getExpectedRepaymentPrincipal();

                // 전역 스타일 추가
                if (!document.getElementById('moneymove-tooltip-style')) {
                    const styleElement = document.createElement('style');
                    styleElement.id = 'moneymove-tooltip-style';
                    styleElement.textContent = `
                        .moneymove-tooltip {
                            position: relative;
                            cursor: help;
                            border-bottom: 1px dotted #999;
                            display: inline-block;
                        }

                        .moneymove-tooltip .tooltip-content {
                            position: absolute;
                            bottom: 100%;
                            left: 50%;
                            transform: translateX(-50%);
                            background: #333 !important;
                            color: white !important;
                            padding: 8px 12px;
                            border-radius: 4px;
                            font-size: 12px !important;
                            white-space: nowrap;
                            z-index: 10000 !important;
                            visibility: hidden;
                            opacity: 0;
                            transition: opacity 0.3s, visibility 0.3s;
                            margin-bottom: 8px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            pointer-events: none;
                        }

                        .moneymove-tooltip:hover .tooltip-content {
                            visibility: visible;
                            opacity: 1;
                        }

                        .moneymove-tooltip .tooltip-content::after {
                            content: '';
                            position: absolute;
                            top: 100%;
                            left: 50%;
                            transform: translateX(-50%);
                            border: 6px solid transparent;
                            border-top-color: #333;
                        }
                    `;
                    document.head.appendChild(styleElement);
                }

                summaryDiv.innerHTML = `
                    <div style="font-size: 15px; line-height: 1.6;">
                        <!-- 핵심 정보 (첫 번째 줄) -->
                        <div style="margin-bottom: 8px; font-weight: bold;">
                            <span class="moneymove-tooltip" style="color: #007bff; font-size: 16px;">
                                연체율: ${overdueRate}${dataNotAvailable ? '' : '%'}
                                <div class="tooltip-content">연체금액 ÷ 상환예정원금 × 100<br>${overdueAmount.toLocaleString()} ÷ ${EXPECTED_REPAYMENT_PRINCIPAL ? EXPECTED_REPAYMENT_PRINCIPAL.toLocaleString() : '?'} × 100</div>
                            </span> | 
                            <span class="moneymove-tooltip" style="color: #007bff;">
                                연체금액: ${overdueAmount.toLocaleString()}원
                                <div class="tooltip-content">연체투자금 - 연체지급금<br>${totalInvestment.toLocaleString()} - ${totalPayment.toLocaleString()}</div>
                            </span> | 
                            <span class="moneymove-tooltip">
                                연체 비중: ${dataNotAvailable ? '?' : overdueRatio + '%'}
                                <div class="tooltip-content">연체투자금 ÷ 상환예정원금 × 100<br>${totalInvestment.toLocaleString()} ÷ ${EXPECTED_REPAYMENT_PRINCIPAL ? EXPECTED_REPAYMENT_PRINCIPAL.toLocaleString() : '?'} × 100</div>
                            </span> | 
                            <span class="moneymove-tooltip">
                                <button id="charts-btn" style="background: none; border: none; color: #009de9; text-decoration: underline; cursor: pointer; font-size: inherit;">📈 차트보기</button>
                                <div class="tooltip-content">1년간 월별 투자 분석 차트<br>• 연체율, 연체금액, 순수익 추이<br>• 손실회복기간, 리스크조정수익률<br>• 종합 대시보드 (마우스오버로 상세 데이터)</div>
                            </span> | 
                            <span class="moneymove-tooltip">
                                <button id="data-manager-btn" style="background: none; border: none; color: #009de9; text-decoration: underline; cursor: pointer; font-size: inherit;">🗂️ 데이터관리</button>
                                <div class="tooltip-content">월별 데이터 관리<br>• 저장된 데이터 보기/편집<br>• 데이터 초기화<br>• 수동 입력</div>
                            </span>
                        </div>

                        <!-- 연체 세부 정보 (두 번째 줄) -->
                        <div style="color: #6c757d; margin-bottom: 8px;">
                            <span style="font-weight: 500; color: #495057;">📊 연체 세부:</span>
                            <span class="moneymove-tooltip">
                                투자금액합계 ${totalInvestment.toLocaleString()}원
                                <div class="tooltip-content">연체 상태인 모든 투자금액의 합계<br>(화면의 투자금액 컬럼 전체 합산)</div>
                            </span> → 
                            <span class="moneymove-tooltip">
                                지급금액합계 ${totalPayment.toLocaleString()}원
                                <div class="tooltip-content">연체 상태에서도 받은 지급금액의 합계<br>(화면의 지급금액 컬럼 전체 합산)</div>
                            </span> → 
                            <span class="moneymove-tooltip">
                                회수율 ${dataNotAvailable ? '?' : paymentRatio + '%'}
                                <div class="tooltip-content">연체지급금 ÷ 연체투자금 × 100<br>${totalPayment.toLocaleString()} ÷ ${totalInvestment.toLocaleString()} × 100</div>
                            </span>
                        </div>

                        <!-- 수익성 분석 (세 번째 줄) -->
                        <div style="color: #6c757d;">
                            <span style="font-weight: 500; color: #495057;">💰 수익 분석:</span>
                            <span class="moneymove-tooltip">
                                예상수익률 ${EXPECTED_YIELD ? EXPECTED_YIELD + '%' : '?'}
                                <div class="tooltip-content">상환중인 원리금수취권의<br>가중평균 수익률 (메인페이지)</div>
                            </span> → 
                            <span class="moneymove-tooltip">
                                리스크조정 ${riskAdjustedReturn ? riskAdjustedReturn + '%' : '?'}
                                <div class="tooltip-content">연체비율을 고려한 실제 수익률<br>${EXPECTED_YIELD ? EXPECTED_YIELD : '?'}% × (1 - ${overdueRatio ? overdueRatio : '?'}% ÷ 100)</div>
                            </span> | 
                            <span class="moneymove-tooltip" style="color: ${netProfit !== null ? (netProfit >= 0 ? '#dc3545' : '#007bff') : 'inherit'};">
                                순수익 ${netProfit !== null ? (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString() + '원' : '?'}
                                <div class="tooltip-content">누적수익에서 연체손실 제외<br>${CUMULATIVE_PROFIT ? CUMULATIVE_PROFIT.toLocaleString() : '?'} - ${overdueAmount.toLocaleString()}</div>
                            </span> | 
                            <span class="moneymove-tooltip">
                                손실회복 ${monthsToRecoverLoss ? monthsToRecoverLoss + '개월' : '?'}
                                <div class="tooltip-content">리스크조정수익률 기준 실제 회복기간<br>${overdueAmount.toLocaleString()} ÷ 실제월수익 ${netMonthlyProfit ? Math.floor(netMonthlyProfit).toLocaleString() : '?'}원<br><br>실제월수익 = (상환예정원금 × 리스크조정수익률 ÷ 12) × (1 - 16.4%)<br>${EXPECTED_REPAYMENT_PRINCIPAL ? EXPECTED_REPAYMENT_PRINCIPAL.toLocaleString() : '?'} × ${riskAdjustedReturn ? riskAdjustedReturn : '?'}% ÷ 12 × 83.6%<br><br>※ 연체리스크 + 세금 15.4% + 플랫폼이용료 1% 모두 반영</div>
                            </span>
                        </div>

                        <!-- 전체 포트폴리오 정보 (네 번째 줄) -->
                        ${!dataNotAvailable ? `
                        <div style="color: #495057; margin-top: 8px; padding-top: 8px; border-top: 1px solid #dee2e6;">
                            <span style="font-weight: 500;">🏦 전체 포트폴리오:</span>
                            <span class="moneymove-tooltip">
                                상환예정원금 ${EXPECTED_REPAYMENT_PRINCIPAL.toLocaleString()}원
                                <div class="tooltip-content">투자한 모든 원리금수취권의<br>원금 총합 (메인페이지 데이터)</div>
                            </span> = 
                            <span class="moneymove-tooltip">
                                정상 ${normalInvestment ? normalInvestment.toLocaleString() + '원' : '?'}
                                <div class="tooltip-content">상환예정원금 - 연체투자금<br>${EXPECTED_REPAYMENT_PRINCIPAL.toLocaleString()} - ${totalInvestment.toLocaleString()}</div>
                            </span> + 
                            <span class="moneymove-tooltip">
                                연체 ${totalInvestment.toLocaleString()}원
                                <div class="tooltip-content">연체 상태인 투자금액 합계</div>
                            </span> | 
                            <span class="moneymove-tooltip">
                                누적수익 ${CUMULATIVE_PROFIT ? CUMULATIVE_PROFIT.toLocaleString() + '원' : '?'}
                                <div class="tooltip-content">전체 투자로부터 얻은<br>누적 순수익액 (메인페이지)</div>
                            </span>
                        </div>
                        ` : ''}
                    </div>
                `;


                // tit-area 바로 다음에 삽입
                titArea.insertAdjacentElement('afterend', summaryDiv);
                
                // 차트 및 데이터 관리 기능 구현
                setupChartAndDataManager();
            }
            // 계산 완료
        }

        // 차트와 데이터 관리 기능 설정 함수
        function setupChartAndDataManager() {
            // Chart.js 라이브러리를 사용한 차트 표시 함수
            window.showMoneyMoveCharts = function() {
                // Chart.js는 manifest에서 이미 로드됨
                if (window.Chart) {
                    createMoneyMoveCharts();
                } else {
                    alert('Chart.js 라이브러리를 로드할 수 없습니다.');
                }
            };
            
            function createMoneyMoveCharts() {
                // 실제 저장된 월별 데이터 가져오기
                let monthlyData = getMonthlyData();
                
                // 데이터가 없으면 더미 데이터 사용 (첫 실행시)
                if (!monthlyData) {
                    monthlyData = {
                        labels: ['더미-01', '더미-02', '더미-03'],
                        overdueRate: [2.1, 3.5, 4.8],
                        overdueAmount: [85000, 143000, 198000],
                        netProfit: [-45000, -23000, 12000],
                        recoveryMonths: [18, 15, 12],
                        riskAdjustedReturn: [14.2, 13.8, 13.5]
                    };
                    console.log('⚠️ 저장된 데이터가 없어 최소 더미 데이터로 차트를 표시합니다.');
                }
                
                // 기존 차트 컨테이너가 있으면 제거
                const existingContainer = document.getElementById('moneymove-charts-container');
                if (existingContainer) {
                    existingContainer.remove();
                }
                
                // 차트 컨테이너 생성
                const chartsContainer = document.createElement('div');
                chartsContainer.id = 'moneymove-charts-container';
                chartsContainer.style.cssText = 
                    'position: fixed;' +
                    'top: 50%;' +
                    'left: 50%;' +
                    'transform: translate(-50%, -50%);' +
                    'background: white;' +
                    'border: 2px solid #dee2e6;' +
                    'border-radius: 8px;' +
                    'padding: 20px;' +
                    'box-shadow: 0 4px 20px rgba(0,0,0,0.15);' +
                    'z-index: 10000;' +
                    'max-width: 90vw;' +
                    'max-height: 90vh;' +
                    'overflow-y: auto;';
                
                chartsContainer.innerHTML = 
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
                        '<h3 style="margin: 0; color: #333;">📈 머니무브 투자 분석 차트</h3>' +
                        '<button id="close-charts-btn" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>' +
                    '</div>' +
                    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">연체율 추이</h4>' +
                            '<canvas id="overdueRateChart" width="400" height="300"></canvas>' +
                        '</div>' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">연체금액 추이</h4>' +
                            '<canvas id="overdueAmountChart" width="400" height="300"></canvas>' +
                        '</div>' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">순수익 추이</h4>' +
                            '<canvas id="netProfitChart" width="400" height="300"></canvas>' +
                        '</div>' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">손실회복 기간</h4>' +
                            '<canvas id="recoveryChart" width="400" height="300"></canvas>' +
                        '</div>' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">리스크조정수익률</h4>' +
                            '<canvas id="riskAdjustedChart" width="400" height="300"></canvas>' +
                        '</div>' +
                        '<div>' +
                            '<h4 style="text-align: center; margin-bottom: 10px;">종합 대시보드</h4>' +
                            '<canvas id="dashboardChart" width="400" height="300"></canvas>' +
                        '</div>' +
                    '</div>';
                
                document.body.appendChild(chartsContainer);
                
                // 닫기 버튼 이벤트 리스너 추가
                document.getElementById('close-charts-btn').addEventListener('click', function() {
                    document.getElementById('moneymove-charts-container').remove();
                });
                
                // 차트 생성
                setTimeout(() => {
                    createChart('overdueRateChart', '연체율 (%)', monthlyData.overdueRate, '#dc3545');
                    createChart('overdueAmountChart', '연체금액 (원)', monthlyData.overdueAmount, '#fd7e14', true);
                    createChart('netProfitChart', '순수익 (원)', monthlyData.netProfit, '#28a745', true);
                    createChart('recoveryChart', '회복기간 (개월)', monthlyData.recoveryMonths, '#6f42c1');
                    createChart('riskAdjustedChart', '리스크조정수익률 (%)', monthlyData.riskAdjustedReturn, '#17a2b8');
                    createDashboardChart(monthlyData);
                }, 100);
                
                function createChart(canvasId, label, data, color, isCurrency = false) {
                    const ctx = document.getElementById(canvasId).getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: monthlyData.labels,
                            datasets: [{
                                label: label,
                                data: data,
                                borderColor: color,
                                backgroundColor: color + '20',
                                tension: 0.4,
                                pointBackgroundColor: color,
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2
                            }]
                        },
                        options: {
                            responsive: true,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            if (isCurrency) {
                                                return label + ': ' + context.parsed.y.toLocaleString() + '원';
                                            }
                                            return label + ': ' + context.parsed.y + (label.includes('%') ? '%' : label.includes('개월') ? '개월' : '');
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: label.includes('순수익') ? false : true,
                                    ticks: {
                                        callback: function(value) {
                                            if (isCurrency) {
                                                return value.toLocaleString() + '원';
                                            }
                                            return value + (label.includes('%') ? '%' : label.includes('개월') ? '개월' : '');
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
                
                function createDashboardChart(data) {
                    const ctx = document.getElementById('dashboardChart').getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.labels,
                            datasets: [
                                {
                                    label: '연체율 (%)',
                                    data: data.overdueRate,
                                    borderColor: '#dc3545',
                                    backgroundColor: '#dc354520',
                                    yAxisID: 'y'
                                },
                                {
                                    label: '순수익 (만원)',
                                    data: data.netProfit.map(v => v / 10000),
                                    borderColor: '#28a745',
                                    backgroundColor: '#28a74520',
                                    yAxisID: 'y1'
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            scales: {
                                y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    title: {
                                        display: true,
                                        text: '연체율 (%)'
                                    }
                                },
                                y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    title: {
                                        display: true,
                                        text: '순수익 (만원)'
                                    },
                                    grid: {
                                        drawOnChartArea: false,
                                    },
                                }
                            }
                        }
                    });
                }
            }
            
            // 데이터 관리 창 표시 함수
            window.showDataManager = function() {
                // 기존 창이 있으면 제거
                const existingManager = document.getElementById('moneymove-data-manager');
                if (existingManager) {
                    existingManager.remove();
                }
                
                // 저장된 데이터 가져오기
                const savedDataCookie = window.getCookie('moneyMoveMonthlyData');
                const savedData = savedDataCookie ? JSON.parse(savedDataCookie) : {};
                const months = Object.keys(savedData).sort();
                
                // 데이터 관리 창 생성
                const managerContainer = document.createElement('div');
                managerContainer.id = 'moneymove-data-manager';
                managerContainer.style.cssText = 
                    'position: fixed;' +
                    'top: 50%;' +
                    'left: 50%;' +
                    'transform: translate(-50%, -50%);' +
                    'background: white;' +
                    'border: 2px solid #dee2e6;' +
                    'border-radius: 8px;' +
                    'padding: 20px;' +
                    'box-shadow: 0 4px 20px rgba(0,0,0,0.15);' +
                    'z-index: 10000;' +
                    'max-width: 90vw;' +
                    'max-height: 90vh;' +
                    'overflow-y: auto;' +
                    'min-width: 600px;';
                
                let dataRows = '';
                if (months.length > 0) {
                    months.forEach(month => {
                        const data = savedData[month];
                        dataRows += 
                            '<tr>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: #495057;">' + month + '</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: #495057; text-align: right;">' + data.overdueRate.toFixed(2) + '%</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: #495057; text-align: right;">' + data.overdueAmount.toLocaleString() + '원</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: ' + (data.netProfit >= 0 ? '#495057' : '#6c757d') + '; text-align: right;">' + data.netProfit.toLocaleString() + '원</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: #495057; text-align: right;">' + data.monthsToRecoverLoss + '개월</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; font-size: 14px; color: #495057; text-align: right;">' + data.riskAdjustedReturn.toFixed(2) + '%</td>' +
                                '<td style="padding: 10px 8px; border-bottom: 1px solid #f1f3f4; text-align: center;"><button class="delete-month-btn" data-month="' + month + '" style="background: white; color: #6c757d; border: 1px solid #dee2e6; padding: 4px 10px; border-radius: 3px; cursor: pointer; font-size: 12px;">삭제</button></td>' +
                            '</tr>';
                    });
                } else {
                    dataRows = '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #6c757d; font-size: 14px;">저장된 데이터가 없습니다</td></tr>';
                }
                
                managerContainer.innerHTML = 
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
                        '<h3 style="margin: 0; color: #333;">🗂️ 월별 데이터 관리</h3>' +
                        '<button id="close-manager-btn" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>' +
                    '</div>' +
                    '<div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e9ecef;">' +
                        '<button id="show-add-form-btn" style="background: #009de9; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer; margin-right: 8px; font-size: 14px;">수동 추가</button>' +
                        '<button id="add-test-data-btn" style="background: white; color: #495057; border: 1px solid #dee2e6; padding: 8px 15px; border-radius: 3px; cursor: pointer; margin-right: 8px; font-size: 14px;">테스트 데이터</button>' +
                        '<button id="export-data-btn" style="background: white; color: #495057; border: 1px solid #dee2e6; padding: 8px 15px; border-radius: 3px; cursor: pointer; margin-right: 8px; font-size: 14px;">내보내기</button>' +
                        '<button id="clear-all-data-btn" style="background: white; color: #6c757d; border: 1px solid #dee2e6; padding: 8px 15px; border-radius: 3px; cursor: pointer; margin-right: 15px; font-size: 14px;">전체 삭제</button>' +
                        '<span style="color: #6c757d; font-size: 13px;">총 ' + months.length + '개월 데이터</span>' +
                    '</div>' +
                    '<div id="add-data-form" style="display: none; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 20px; margin-bottom: 20px;">' +
                        '<h4 style="margin: 0 0 20px 0; color: #495057; font-weight: 500;">월별 데이터 추가</h4>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">월 (YYYY-MM)</label>' +
                                '<input type="month" id="manual-month" style="width: 90%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">연체율 (%)</label>' +
                                '<input type="number" id="manual-overdue-rate" step="0.01" placeholder="7.62" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">연체금액 (원)</label>' +
                                '<input type="number" id="manual-overdue-amount" placeholder="314649" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                        '</div>' +
                        '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 15px;">' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">순수익 (원)</label>' +
                                '<input type="number" id="manual-net-profit" placeholder="116754" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">손실회복기간 (개월)</label>' +
                                '<input type="number" id="manual-recovery-months" placeholder="9" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                            '<div>' +
                                '<label style="display: block; margin-bottom: 5px; font-weight: 500;">리스크조정수익률 (%)</label>' +
                                '<input type="number" id="manual-risk-adjusted" step="0.01" placeholder="13.12" style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">' +
                            '</div>' +
                        '</div>' +
                        '<div style="text-align: right; margin-top: 20px;">' +
                            '<button id="cancel-form-btn" style="background: white; color: #6c757d; border: 1px solid #dee2e6; padding: 8px 15px; border-radius: 3px; cursor: pointer; margin-right: 10px; font-size: 14px;">취소</button>' +
                            '<button id="save-manual-data-btn" style="background: #009de9; color: white; border: none; padding: 8px 15px; border-radius: 3px; cursor: pointer; font-size: 14px;">저장</button>' +
                        '</div>' +
                    '</div>' +
                    '<div style="max-height: 400px; overflow-y: auto;">' +
                        '<table style="width: 100%; border-collapse: collapse;">' +
                            '<thead>' +
                                '<tr style="background: #f8f9fa; border-bottom: 1px solid #dee2e6;">' +
                                    '<th style="padding: 12px 8px; text-align: left; font-weight: 500; color: #495057; font-size: 14px;">월</th>' +
                                    '<th style="padding: 12px 8px; text-align: right; font-weight: 500; color: #495057; font-size: 14px;">연체율</th>' +
                                    '<th style="padding: 12px 8px; text-align: right; font-weight: 500; color: #495057; font-size: 14px;">연체금액</th>' +
                                    '<th style="padding: 12px 8px; text-align: right; font-weight: 500; color: #495057; font-size: 14px;">순수익</th>' +
                                    '<th style="padding: 12px 8px; text-align: right; font-weight: 500; color: #495057; font-size: 14px;">회복기간</th>' +
                                    '<th style="padding: 12px 8px; text-align: right; font-weight: 500; color: #495057; font-size: 14px;">리스크조정</th>' +
                                    '<th style="padding: 12px 8px; text-align: center; font-weight: 500; color: #495057; font-size: 14px;">관리</th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody>' + dataRows + '</tbody>' +
                        '</table>' +
                    '</div>';
                
                document.body.appendChild(managerContainer);
                
                // 데이터 관리 함수들 정의 (전역으로 설정)
                setupDataManagerFunctions();
                
                // 이벤트 리스너 추가
                document.getElementById('close-manager-btn').addEventListener('click', function() {
                    document.getElementById('moneymove-data-manager').remove();
                });
                
                document.getElementById('show-add-form-btn').addEventListener('click', function() {
                    showAddDataForm();
                });
                
                document.getElementById('add-test-data-btn').addEventListener('click', function() {
                    addTestData();
                });
                
                document.getElementById('export-data-btn').addEventListener('click', function() {
                    exportData();
                });
                
                document.getElementById('clear-all-data-btn').addEventListener('click', function() {
                    clearAllData();
                });
                
                document.getElementById('cancel-form-btn').addEventListener('click', function() {
                    hideAddDataForm();
                });
                
                document.getElementById('save-manual-data-btn').addEventListener('click', function() {
                    saveManualData();
                });
                
                // 삭제 버튼들 이벤트 리스너
                document.querySelectorAll('.delete-month-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const month = this.getAttribute('data-month');
                        deleteMonthData(month);
                    });
                });
            };
            
            // 데이터 관리 함수들 설정
            function setupDataManagerFunctions() {
                window.deleteMonthData = function(month) {
                    if (confirm(month + ' 데이터를 삭제하시겠습니까?')) {
                        const dataCookie = window.getCookie('moneyMoveMonthlyData');
                        const data = dataCookie ? JSON.parse(dataCookie) : {};
                        delete data[month];
                        window.setCookie('moneyMoveMonthlyData', JSON.stringify(data));
                        showDataManager(); // 창 새로고침
                    }
                };
                
                window.clearAllData = function() {
                    if (confirm('모든 월별 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        window.setCookie('moneyMoveMonthlyData', '', -1); // 삭제
                        showDataManager(); // 창 새로고침
                    }
                };
                
                window.exportData = function() {
                    const data = window.getCookie('moneyMoveMonthlyData');
                    if (data) {
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'moneymove-data-' + new Date().toISOString().slice(0, 10) + '.json';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    } else {
                        alert('내보낼 데이터가 없습니다.');
                    }
                };
                
                // 수동 데이터 추가 폼 관련 함수들
                window.showAddDataForm = function() {
                    const form = document.getElementById('add-data-form');
                    if (form) {
                        form.style.display = 'block';
                        // 현재 월로 기본값 설정
                        const currentDate = new Date();
                        const currentMonth = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
                        document.getElementById('manual-month').value = currentMonth;
                    }
                };
                
                window.hideAddDataForm = function() {
                    const form = document.getElementById('add-data-form');
                    if (form) {
                        form.style.display = 'none';
                        // 입력 필드 초기화
                        document.getElementById('manual-month').value = '';
                        document.getElementById('manual-overdue-rate').value = '';
                        document.getElementById('manual-overdue-amount').value = '';
                        document.getElementById('manual-net-profit').value = '';
                        document.getElementById('manual-recovery-months').value = '';
                        document.getElementById('manual-risk-adjusted').value = '';
                    }
                };
                
                window.saveManualData = function() {
                    // 입력 값 가져오기
                    const month = document.getElementById('manual-month').value;
                    const overdueRate = parseFloat(document.getElementById('manual-overdue-rate').value);
                    const overdueAmount = parseInt(document.getElementById('manual-overdue-amount').value);
                    const netProfit = parseInt(document.getElementById('manual-net-profit').value);
                    const recoveryMonths = parseInt(document.getElementById('manual-recovery-months').value);
                    const riskAdjusted = parseFloat(document.getElementById('manual-risk-adjusted').value);
                    
                    // 필수 값 검증
                    if (!month) {
                        alert('월을 입력해주세요.');
                        return;
                    }
                    
                    if (isNaN(overdueRate) || isNaN(overdueAmount) || isNaN(netProfit) || isNaN(recoveryMonths) || isNaN(riskAdjusted)) {
                        alert('모든 숫자 값을 올바르게 입력해주세요.');
                        return;
                    }
                    
                    // 기존 데이터 가져오기 (쿠키에서)
                    const existingDataCookie = window.getCookie('moneyMoveMonthlyData');
                    const existingData = existingDataCookie ? JSON.parse(existingDataCookie) : {};
                    
                    // 중복 체크
                    if (existingData[month]) {
                        if (!confirm(month + ' 데이터가 이미 존재합니다. 덮어쓰시겠습니까?')) {
                            return;
                        }
                    }
                    
                    // 새 데이터 저장
                    existingData[month] = {
                        date: month,
                        overdueRate: overdueRate,
                        overdueAmount: overdueAmount,
                        netProfit: netProfit,
                        monthsToRecoverLoss: recoveryMonths,
                        riskAdjustedReturn: riskAdjusted,
                        timestamp: Date.now(),
                        isManual: true // 수동 입력 표시
                    };
                    
                    // 쿠키에 저장
                    window.setCookie('moneyMoveMonthlyData', JSON.stringify(existingData));
                    
                    // 폼 숨기기
                    hideAddDataForm();
                    
                    // 데이터 관리 창 새로고침 (자동 정렬됨)
                    showDataManager();
                    
                    alert(month + ' 데이터가 성공적으로 추가되었습니다!');
                };
                
                // 테스트 데이터 추가 함수
                window.addTestData = function() {
                    if (!confirm('12개월간의 테스트 데이터를 추가하시겠습니까? 기존 데이터는 유지됩니다.')) {
                        return;
                    }
                    
                    const existingDataCookie = window.getCookie('moneyMoveMonthlyData');
                    const existingData = existingDataCookie ? JSON.parse(existingDataCookie) : {};
                    
                    // 2024년 1월부터 12월까지 테스트 데이터
                    const testData = [
                        { month: '2024-01', overdueRate: 2.1, overdueAmount: 85000, netProfit: -45000, recoveryMonths: 18, riskAdjusted: 14.2 },
                        { month: '2024-02', overdueRate: 3.5, overdueAmount: 143000, netProfit: -23000, recoveryMonths: 15, riskAdjusted: 13.8 },
                        { month: '2024-03', overdueRate: 4.8, overdueAmount: 198000, netProfit: 12000, recoveryMonths: 12, riskAdjusted: 13.5 },
                        { month: '2024-04', overdueRate: 5.2, overdueAmount: 215000, netProfit: 35000, recoveryMonths: 11, riskAdjusted: 13.4 },
                        { month: '2024-05', overdueRate: 6.1, overdueAmount: 251000, netProfit: 58000, recoveryMonths: 10, riskAdjusted: 13.2 },
                        { month: '2024-06', overdueRate: 6.8, overdueAmount: 280000, netProfit: 72000, recoveryMonths: 9, riskAdjusted: 13.1 },
                        { month: '2024-07', overdueRate: 7.3, overdueAmount: 301000, netProfit: 89000, recoveryMonths: 9, riskAdjusted: 13.0 },
                        { month: '2024-08', overdueRate: 7.9, overdueAmount: 325000, netProfit: 95000, recoveryMonths: 8, riskAdjusted: 12.9 },
                        { month: '2024-09', overdueRate: 8.4, overdueAmount: 346000, netProfit: 102000, recoveryMonths: 8, riskAdjusted: 12.8 },
                        { month: '2024-10', overdueRate: 8.1, overdueAmount: 334000, netProfit: 108000, recoveryMonths: 8, riskAdjusted: 12.9 },
                        { month: '2024-11', overdueRate: 7.6, overdueAmount: 314000, netProfit: 115000, recoveryMonths: 8, riskAdjusted: 13.0 },
                        { month: '2024-12', overdueRate: 7.62, overdueAmount: 314649, netProfit: 116754, recoveryMonths: 9, riskAdjusted: 13.12 }
                    ];
                    
                    let addedCount = 0;
                    let skippedCount = 0;
                    
                    testData.forEach(data => {
                        if (!existingData[data.month]) {
                            existingData[data.month] = {
                                date: data.month,
                                overdueRate: data.overdueRate,
                                overdueAmount: data.overdueAmount,
                                netProfit: data.netProfit,
                                monthsToRecoverLoss: data.recoveryMonths,
                                riskAdjustedReturn: data.riskAdjusted,
                                timestamp: Date.now(),
                                isTest: true // 테스트 데이터 표시
                            };
                            addedCount++;
                        } else {
                            skippedCount++;
                        }
                    });
                    
                    // 쿠키에 저장
                    window.setCookie('moneyMoveMonthlyData', JSON.stringify(existingData));
                    
                    // 데이터 관리 창 새로고침
                    showDataManager();
                    
                    alert('테스트 데이터 ' + addedCount + '개를 추가했습니다!' + (skippedCount > 0 ? '\n(' + skippedCount + '개는 이미 존재해서 건너뜀)' : ''));
                };
            }
            
            // 이벤트 리스너 추가
            document.getElementById('charts-btn').addEventListener('click', function() {
                showMoneyMoveCharts();
            });
            
            document.getElementById('data-manager-btn').addEventListener('click', function() {
                showDataManager();
            });
        }

        // 메인페이지 데이터 업데이트 완료를 대기하여 시작
        const checkAndStart = () => {
            if (window.startCalculation) {
                console.log('✅ 메인페이지 데이터 준비 완료, 계산 시작');
                clickMoreButton();
            } else {
                console.log('⏳ 메인페이지 데이터 대기 중...');
                setTimeout(checkAndStart, 500);
            }
        };

        setTimeout(checkAndStart, 1000);
    } // initializeExtension 함수 끝
})();