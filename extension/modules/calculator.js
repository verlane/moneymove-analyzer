// calculator.js - 계산 로직 모듈

class Calculator {
    constructor() {
        this.TAX_AND_FEE_RATE = 16.4; // 세금 15.4% + 플랫폼이용료 1%
    }

    // 페이지에서 총 지급금액과 투자금액 계산
    calculateTotals() {
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

        return {
            totalPayment,
            totalInvestment,
            overdueAmount: totalInvestment - totalPayment
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
    calculateOverdueRatio(totalInvestment, expectedRepaymentPrincipal) {
        if (!expectedRepaymentPrincipal || expectedRepaymentPrincipal === 0) {
            return null;
        }
        return (totalInvestment / expectedRepaymentPrincipal * 100).toFixed(1);
    }

    // 회수율 계산
    calculatePaymentRatio(totalPayment, totalInvestment) {
        if (totalInvestment === 0) {
            return null;
        }
        return (totalPayment / totalInvestment * 100).toFixed(1);
    }

    // 정상 투자금 계산
    calculateNormalInvestment(expectedRepaymentPrincipal, totalInvestment) {
        if (!expectedRepaymentPrincipal) {
            return null;
        }
        return expectedRepaymentPrincipal - totalInvestment;
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
    calculateAllMetrics(expectedRepaymentPrincipal, expectedYield, cumulativeProfit) {
        // 페이지에서 기본 데이터 수집
        const { totalPayment, totalInvestment, overdueAmount } = this.calculateTotals();

        // 기본 비율들 계산
        const overdueRate = this.calculateOverdueRate(overdueAmount, expectedRepaymentPrincipal);
        const overdueRatio = this.calculateOverdueRatio(totalInvestment, expectedRepaymentPrincipal);
        const paymentRatio = this.calculatePaymentRatio(totalPayment, totalInvestment);
        const normalInvestment = this.calculateNormalInvestment(expectedRepaymentPrincipal, totalInvestment);

        // 수익성 지표들 계산
        const netProfit = this.calculateNetProfit(cumulativeProfit, overdueAmount);
        const lossRatio = this.calculateLossRatio(overdueAmount, cumulativeProfit);
        const profitImpact = this.calculateProfitImpact(netProfit, cumulativeProfit);
        const recoveryNeeded = this.calculateRecoveryNeeded(overdueAmount, totalInvestment);

        // 리스크 및 회복 지표들 계산
        const riskAdjustedReturn = this.calculateRiskAdjustedReturn(expectedYield, overdueRatio);
        const netMonthlyProfit = this.calculateNetMonthlyProfit(expectedRepaymentPrincipal, riskAdjustedReturn);
        const monthsToRecoverLoss = this.calculateMonthsToRecoverLoss(overdueAmount, netMonthlyProfit);

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