// calculator.js - 계산 로직 모듈

class Calculator {
    constructor() {
        this.TAX_AND_FEE_RATE = 16.4; // 세금 15.4% + 플랫폼이용료 1%
    }

    // 페이지에서 총 지급금액과 투자금액 계산 (상태별 분류 포함)
    calculateTotals() {
        // 가장 많은 데이터를 가진 올바른 테이블만 선택 (중복 방지)
        const tables = document.querySelectorAll('table');
        let bestTable = null;
        let maxRows = 0;
        
        tables.forEach(table => {
            const rowsInTable = table.querySelectorAll('tr[id="note-row"]');
            if (rowsInTable.length > maxRows) {
                maxRows = rowsInTable.length;
                bestTable = table;
            }
        });
        
        const rows = bestTable ? bestTable.querySelectorAll('tr[id="note-row"]') : document.querySelectorAll('tr[id="note-row"]');
        let totalPayment = 0;
        let totalInvestment = 0;

        // 상태별 분류
        const statusBreakdown = {
            '상환지연': { amount: 0, count: 0 },
            '단기연체': { amount: 0, count: 0 },
            '개인회생': { amount: 0, count: 0 }
        };

        rows.forEach((row, index) => {
            // 상태 확인 - 두 번째 data-unit에서 상태 정보 찾기
            const statusCell = row.querySelectorAll('td.data-unit')[1];
            let status = '';
            if (statusCell) {
                const statusText = statusCell.textContent.trim();
                if (statusText.includes('상환지연')) {
                    status = '상환지연';
                } else if (statusText.includes('단기연체')) {
                    status = '단기연체';
                } else if (statusText.includes('개인회생') || statusText.includes('파산')) {
                    status = '개인회생';
                }
            }
            
            // 지급금액/투자금액 셀을 직접 찾기 (테이블 구조 기준으로)
            const amountCell = row.querySelector('td.data-unit:nth-last-child(2)'); // 끝에서 두 번째 data-unit
            
            if (amountCell && status) {
                let payment = 0;
                let investment = 0;
                
                // 지급금액과 투자금액 스팬들 찾기
                const spans = amountCell.querySelectorAll('span.data-info');
                spans.forEach(span => {
                    const text = span.textContent.trim();
                    if (text.includes('지급금액')) {
                        // 해당 span의 마지막 span에서 값 추출
                        const valueSpan = span.querySelector('span');
                        if (valueSpan) {
                            const value = valueSpan.textContent.trim().replace(/,/g, '');
                            if (!isNaN(value) && value !== '') {
                                payment = parseInt(value);
                            }
                        }
                    } else if (text.includes('투자금액')) {
                        // 해당 span의 마지막 span에서 값 추출
                        const valueSpan = span.querySelector('span');
                        if (valueSpan) {
                            const value = valueSpan.textContent.trim().replace(/,/g, '');
                            if (!isNaN(value) && value !== '') {
                                investment = parseInt(value);
                            }
                        }
                    }
                });
                
                // 값이 유효할 때만 처리
                if (investment > 0) {
                    
                    totalPayment += payment;
                    totalInvestment += investment;
                    
                    // 상태별 집계
                    if (statusBreakdown[status]) {
                        statusBreakdown[status].amount += (investment - payment);
                        statusBreakdown[status].count += 1;
                        statusBreakdown[status].totalInvestment = (statusBreakdown[status].totalInvestment || 0) + investment;
                        statusBreakdown[status].totalPayment = (statusBreakdown[status].totalPayment || 0) + payment;
                    }
                }
            }
        });

        return {
            totalPayment,
            totalInvestment,
            overdueAmount: totalInvestment - totalPayment,
            statusBreakdown
        };
    }

    // 연체율 계산
    calculateOverdueRate(overdueAmount, expectedRepaymentPrincipal) {
        if (!expectedRepaymentPrincipal || expectedRepaymentPrincipal === 0) {
            return 'N/A';
        }
        return (overdueAmount / expectedRepaymentPrincipal * 100).toFixed(2);
    }

    // 연체 비중 계산
    calculateOverdueRatio(overdueAmount, expectedRepaymentPrincipal) {
        if (!expectedRepaymentPrincipal || expectedRepaymentPrincipal === 0) {
            return null;
        }
        return (overdueAmount / expectedRepaymentPrincipal * 100).toFixed(1);
    }

    // 회수율 계산
    calculatePaymentRatio(totalPayment, totalInvestment) {
        if (totalInvestment === 0) {
            return totalPayment === 0 ? '0' : '100';
        }
        return (totalPayment / totalInvestment * 100).toFixed(1);
    }

    // 정상 투자금 계산
    calculateNormalInvestment(expectedRepaymentPrincipal, overdueAmount) {
        if (!expectedRepaymentPrincipal) {
            return null;
        }
        return expectedRepaymentPrincipal - overdueAmount;
    }

    // 순수익 계산
    calculateNetProfit(cumulativeProfit, overdueAmount) {
        if (!cumulativeProfit) {
            return null;
        }
        return cumulativeProfit - overdueAmount;
    }

    // 손실 비율 계산
    calculateLossRatio(overdueAmount, cumulativeProfit) {
        if (!cumulativeProfit || cumulativeProfit <= 0) {
            return null;
        }
        return (overdueAmount / cumulativeProfit * 100).toFixed(1);
    }

    // 수익 영향도 계산
    calculateProfitImpact(netProfit, cumulativeProfit) {
        if (!cumulativeProfit || cumulativeProfit <= 0) {
            return null;
        }
        return (netProfit / cumulativeProfit * 100).toFixed(1);
    }

    // 회수 필요율 계산
    calculateRecoveryNeeded(overdueAmount, totalInvestment) {
        if (overdueAmount <= 0 || totalInvestment === 0) {
            return null;
        }
        return ((overdueAmount / totalInvestment) * 100).toFixed(1);
    }

    // 리스크 조정 수익률 계산
    calculateRiskAdjustedReturn(expectedYield, overdueRatio) {
        if (!expectedYield || !overdueRatio) {
            return null;
        }
        return (expectedYield * (1 - overdueRatio / 100)).toFixed(2);
    }

    // 예상 손실액 계산 (상태별 가중치 적용)
    async calculateExpectedLoss(statusBreakdown) {
        // 저장된 손실률 설정 로드
        const savedSettings = await this.loadLossRateSettings();
        
        const lossWeights = {
            '상환지연': savedSettings.delayLossRate / 100,
            '단기연체': savedSettings.shortOverdueLossRate / 100,
            '개인회생': savedSettings.bankruptcyLossRate / 100
        };

        let expectedLoss = 0;
        for (const [status, data] of Object.entries(statusBreakdown)) {
            if (lossWeights[status]) {
                expectedLoss += data.amount * lossWeights[status];
            }
        }
        
        return Math.round(expectedLoss);
    }

    // 실제 손실률 계산
    calculateActualLossRate(expectedLoss, expectedRepaymentPrincipal) {
        if (!expectedRepaymentPrincipal || expectedRepaymentPrincipal === 0) {
            return null;
        }
        return (expectedLoss / expectedRepaymentPrincipal * 100).toFixed(2);
    }

    // 예상 손실액 기반 순수익 계산
    calculateExpectedNetProfit(cumulativeProfit, expectedLoss) {
        if (!cumulativeProfit) {
            return null;
        }
        return cumulativeProfit - expectedLoss;
    }

    // 예상 손실액 기반 손실회복 개월 계산
    calculateExpectedMonthsToRecoverLoss(expectedLoss, netMonthlyProfit) {
        if (!netMonthlyProfit || expectedLoss <= 0) {
            return null;
        }
        return Math.ceil(expectedLoss / netMonthlyProfit);
    }

    // 실제 월수익 계산 (세금 및 수수료 차감 후)
    calculateNetMonthlyProfit(expectedRepaymentPrincipal, riskAdjustedReturn) {
        if (!expectedRepaymentPrincipal || !riskAdjustedReturn) {
            return null;
        }
        const monthlyReturn = (expectedRepaymentPrincipal * parseFloat(riskAdjustedReturn) / 100) / 12;
        return monthlyReturn * (1 - this.TAX_AND_FEE_RATE / 100);
    }

    // 손실 회복 소요 개월수 계산
    calculateMonthsToRecoverLoss(overdueAmount, netMonthlyProfit) {
        if (!netMonthlyProfit || overdueAmount <= 0) {
            return null;
        }
        return Math.ceil(overdueAmount / netMonthlyProfit);
    }

    // 종합 계산 (모든 지표를 한번에 계산)
    async calculateAllMetrics(expectedRepaymentPrincipal, expectedYield, cumulativeProfit) {
        // 페이지에서 기본 데이터 수집 (상태별 분류 포함)
        const { totalPayment, totalInvestment, overdueAmount, statusBreakdown } = this.calculateTotals();

        // 기본 비율들 계산
        const overdueRate = this.calculateOverdueRate(overdueAmount, expectedRepaymentPrincipal);
        const overdueRatio = this.calculateOverdueRatio(overdueAmount, expectedRepaymentPrincipal);
        const paymentRatio = this.calculatePaymentRatio(totalPayment, totalInvestment);
        const normalInvestment = this.calculateNormalInvestment(expectedRepaymentPrincipal, overdueAmount);

        // 수익성 지표들 계산
        const netProfit = this.calculateNetProfit(cumulativeProfit, overdueAmount);
        const lossRatio = this.calculateLossRatio(overdueAmount, cumulativeProfit);
        const profitImpact = this.calculateProfitImpact(netProfit, cumulativeProfit);
        const recoveryNeeded = this.calculateRecoveryNeeded(overdueAmount, totalInvestment);

        // 리스크 및 회복 지표들 계산
        const riskAdjustedReturn = this.calculateRiskAdjustedReturn(expectedYield, overdueRatio);
        const netMonthlyProfit = this.calculateNetMonthlyProfit(expectedRepaymentPrincipal, riskAdjustedReturn);
        const monthsToRecoverLoss = this.calculateMonthsToRecoverLoss(overdueAmount, netMonthlyProfit);

        // 손실 위험도 계산
        const expectedLoss = await this.calculateExpectedLoss(statusBreakdown);
        const actualLossRate = this.calculateActualLossRate(expectedLoss, expectedRepaymentPrincipal);

        // 예상 손실액 기반 계산
        const expectedNetProfit = this.calculateExpectedNetProfit(cumulativeProfit, expectedLoss);
        const expectedMonthsToRecoverLoss = this.calculateExpectedMonthsToRecoverLoss(expectedLoss, netMonthlyProfit);

        // 총 수취액 계산
        const totalReceivedAmount = totalPayment + (cumulativeProfit || 0);

        return {
            // 기본 데이터
            totalPayment,
            totalInvestment,
            overdueAmount,
            
            // 비율 지표
            overdueRate,
            overdueRatio,
            paymentRatio,
            normalInvestment,
            
            // 수익성 지표
            netProfit,
            lossRatio,
            profitImpact,
            recoveryNeeded,
            totalReceivedAmount,
            
            // 리스크 및 회복 지표
            riskAdjustedReturn,
            netMonthlyProfit,
            monthsToRecoverLoss,
            
            // 상태별 분류 및 손실 위험도
            statusBreakdown,
            expectedLoss,
            actualLossRate,
            expectedNetProfit,
            expectedMonthsToRecoverLoss,
            
            // 메타 정보
            dataNotAvailable: !expectedRepaymentPrincipal,
            calculationTimestamp: Date.now()
        };
    }

    // 숫자 포맷팅 유틸리티
    formatNumber(num) {
        if (num === null || num === undefined) return '?';
        return num.toLocaleString();
    }

    // 퍼센트 포맷팅 유틸리티
    formatPercent(num, decimals = 1) {
        if (num === null || num === undefined) return '?';
        return parseFloat(num).toFixed(decimals) + '%';
    }

    // 개월 포맷팅 유틸리티
    formatMonths(num, decimals = 0) {
        if (num === null || num === undefined) return '?';
        return parseFloat(num).toFixed(decimals) + '개월';
    }

    // 원화 포맷팅 유틸리티
    formatCurrency(num) {
        if (num === null || num === undefined) return '?';
        return num.toLocaleString() + '원';
    }

    // 손실률 설정 로드
    async loadLossRateSettings() {
        const savedSettings = await window.getStorageData('moneyMoveLossRateSettings');
        
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        
        // 기본값 반환
        return {
            delayLossRate: 30,
            shortOverdueLossRate: 50,
            bankruptcyLossRate: 70
        };
    }

    // 데이터 유효성 검증
    validateCalculationInputs(expectedRepaymentPrincipal, expectedYield, cumulativeProfit) {
        const warnings = [];
        
        if (!expectedRepaymentPrincipal || expectedRepaymentPrincipal <= 0) {
            warnings.push('상환예정원금 데이터가 없습니다.');
        }
        
        if (!expectedYield || expectedYield <= 0) {
            warnings.push('예상수익률 데이터가 없습니다.');
        }
        
        if (cumulativeProfit === null || cumulativeProfit === undefined) {
            warnings.push('누적수익 데이터가 없습니다.');
        }
        
        return {
            isValid: warnings.length === 0,
            warnings
        };
    }
}

// 전역으로 노출
window.Calculator = Calculator;