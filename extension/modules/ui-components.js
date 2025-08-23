// ui-components.js - UI 컴포넌트 생성 및 관리 모듈

class UIComponents {
    constructor() {
        this.loadingElement = null;
    }

    // 로딩 상태 표시
    showLoadingStatus() {
        this.hideLoadingStatus(); // 기존 로딩 제거
        
        const titArea = document.querySelector('.tit-area');
        if (titArea) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.id = 'moneymove-loading';
            this.loadingElement.className = 'mm-loading';
            this.loadingElement.innerHTML = `
                <div class="mm-loading-content">
                    <div class="mm-spinner"></div>
                    <span>연체 데이터 분석 중...</span>
                </div>
            `;
            titArea.appendChild(this.loadingElement);
        }
    }

    // 로딩 상태 숨기기
    hideLoadingStatus() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
        
        // ID로도 찾아서 제거 (안전장치)
        const existingLoading = document.getElementById('moneymove-loading');
        if (existingLoading) {
            existingLoading.remove();
        }
    }

    // 요약 박스 생성
    createSummaryBox(metrics, monthMinMax = '') {
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mm-summary';

        summaryDiv.innerHTML = `
            <div class="mm-summary-content">
                <!-- 핵심 정보 (첫 번째 줄) -->
                <div class="mm-summary-row">
                    <span class="moneymove-tooltip">
                        연체율: <span class="text-primary">${metrics.overdueRate}${metrics.dataNotAvailable ? '' : '%'}</span> ${monthMinMax}
                        <div class="tooltip-content">연체금액 ÷ 상환예정원금 × 100<br>${metrics.overdueAmount.toLocaleString()} ÷ ${metrics.expectedRepaymentPrincipal ? metrics.expectedRepaymentPrincipal.toLocaleString() : '?'} × 100<br><br>이번 달 최소/최대: ${monthMinMax || '첫 계산'}</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        연체금액: <span class="text-primary">${metrics.overdueAmount.toLocaleString()}원</span>
                        <div class="tooltip-content">연체투자금 - 연체지급금<br>${metrics.totalInvestment.toLocaleString()} - ${metrics.totalPayment.toLocaleString()}</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        연체 비중: ${metrics.dataNotAvailable ? '?' : metrics.overdueRatio + '%'}
                        <div class="tooltip-content">연체투자금 ÷ 상환예정원금 × 100<br>${metrics.totalInvestment.toLocaleString()} ÷ ${metrics.expectedRepaymentPrincipal ? metrics.expectedRepaymentPrincipal.toLocaleString() : '?'} × 100</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        <button id="charts-btn" class="mm-btn-link">📈 차트보기</button>
                        <div class="tooltip-content">1년간 월별 투자 분석 차트<br>• 연체율, 연체금액, 순수익 추이<br>• 손실회복기간, 리스크조정수익률<br>• 종합 대시보드 (마우스오버로 상세 데이터)</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        <button id="data-manager-btn" class="mm-btn-link">🗂️ 데이터관리</button>
                        <div class="tooltip-content">월별 데이터 관리<br>• 저장된 데이터 보기/편집<br>• 데이터 초기화<br>• 수동 입력</div>
                    </span>
                </div>

                <!-- 연체 세부 정보 (두 번째 줄) -->
                <div class="mm-summary-section">
                    <span class="mm-summary-section-title">📊 연체 세부:</span>
                    <span class="moneymove-tooltip">
                        투자금액합계 ${metrics.totalInvestment.toLocaleString()}원
                        <div class="tooltip-content">연체 상태인 모든 투자금액의 합계<br>(화면의 투자금액 컬럼 전체 합산)</div>
                    </span> → 
                    <span class="moneymove-tooltip">
                        지급금액합계 ${metrics.totalPayment.toLocaleString()}원
                        <div class="tooltip-content">연체 상태에서도 받은 지급금액의 합계<br>(화면의 지급금액 컬럼 전체 합산)</div>
                    </span> → 
                    <span class="moneymove-tooltip">
                        회수율 ${metrics.dataNotAvailable ? '?' : metrics.paymentRatio + '%'}
                        <div class="tooltip-content">연체지급금 ÷ 연체투자금 × 100<br>${metrics.totalPayment.toLocaleString()} ÷ ${metrics.totalInvestment.toLocaleString()} × 100</div>
                    </span>
                </div>

                <!-- 수익성 분석 (세 번째 줄) -->
                <div class="mm-summary-section">
                    <span class="mm-summary-section-title">💰 수익 분석:</span>
                    <span class="moneymove-tooltip">
                        예상수익률 ${metrics.expectedYield ? metrics.expectedYield + '%' : '?'}
                        <div class="tooltip-content">상환중인 원리금수취권의<br>가중평균 수익률 (메인페이지)</div>
                    </span> → 
                    <span class="moneymove-tooltip">
                        리스크조정수익률 ${metrics.riskAdjustedReturn ? metrics.riskAdjustedReturn + '%' : '?'}
                        <div class="tooltip-content">연체리스크를 반영한 실제 수익률<br>예상수익률 × (1 - 연체비중)<br>${metrics.expectedYield ? metrics.expectedYield : '?'}% × (1 - ${metrics.overdueRatio ? metrics.overdueRatio : '?'}%)</div>
                    </span> → 
                    <span class="moneymove-tooltip">
                        순수익 ${metrics.netProfit !== null ? (metrics.netProfit >= 0 ? '<span class="text-danger">' : '<span class="text-primary">') + metrics.netProfit.toLocaleString() + '원</span>' : '?'}
                        <div class="tooltip-content">누적수익 - 연체손실금액<br>${metrics.cumulativeProfit ? metrics.cumulativeProfit.toLocaleString() : '?'} - ${metrics.overdueAmount.toLocaleString()}</div>
                    </span> → 
                    <span class="moneymove-tooltip">
                        손실회복 ${metrics.monthsToRecoverLoss ? metrics.monthsToRecoverLoss + '개월' : '?'}
                        <div class="tooltip-content">리스크조정수익률 기준 실제 회복기간<br>${metrics.overdueAmount.toLocaleString()} ÷ 실제월수익 ${metrics.netMonthlyProfit ? Math.floor(metrics.netMonthlyProfit).toLocaleString() : '?'}원<br><br>실제월수익 = (상환예정원금 × 리스크조정수익률 ÷ 12) × (1 - 16.4%)<br>${metrics.expectedRepaymentPrincipal ? metrics.expectedRepaymentPrincipal.toLocaleString() : '?'} × ${metrics.riskAdjustedReturn ? metrics.riskAdjustedReturn : '?'}% ÷ 12 × 83.6%<br><br>※ 연체리스크 + 세금 15.4% + 플랫폼이용료 1% 모두 반영</div>
                    </span>
                </div>

                <!-- 전체 포트폴리오 정보 (네 번째 줄) -->
                ${!metrics.dataNotAvailable ? `
                <div class="mm-portfolio-section">
                    <span class="mm-summary-section-title">🏦 전체 포트폴리오:</span>
                    <span class="moneymove-tooltip">
                        상환예정원금 ${metrics.expectedRepaymentPrincipal.toLocaleString()}원
                        <div class="tooltip-content">투자한 모든 원리금수취권의<br>원금 총합 (메인페이지 데이터)</div>
                    </span> = 
                    <span class="moneymove-tooltip">
                        정상 ${metrics.normalInvestment ? metrics.normalInvestment.toLocaleString() + '원' : '?'}
                        <div class="tooltip-content">상환예정원금 - 연체투자금<br>${metrics.expectedRepaymentPrincipal.toLocaleString()} - ${metrics.totalInvestment.toLocaleString()}</div>
                    </span> + 
                    <span class="moneymove-tooltip">
                        연체 ${metrics.totalInvestment.toLocaleString()}원
                        <div class="tooltip-content">연체 상태인 투자금액 합계</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        누적수익 ${metrics.cumulativeProfit ? metrics.cumulativeProfit.toLocaleString() + '원' : '?'}
                        <div class="tooltip-content">전체 투자로부터 얻은<br>누적 순수익액 (메인페이지)</div>
                    </span>
                </div>
                ` : ''}
            </div>
        `;

        return summaryDiv;
    }

    // 기존 요약 박스 제거
    removeSummaryBox() {
        const existing = document.querySelector('.mm-summary');
        if (existing) {
            existing.remove();
        }
    }

    // 요약 박스를 페이지에 추가
    addSummaryToPage(summaryElement) {
        const titArea = document.querySelector('.tit-area');
        if (titArea) {
            titArea.appendChild(summaryElement);
        }
    }

    // 이벤트 리스너 설정 (차트보기, 데이터관리 버튼)
    setupSummaryEventListeners(chartManager, dataManager) {
        // 차트보기 버튼
        const chartsBtn = document.getElementById('charts-btn');
        if (chartsBtn) {
            chartsBtn.addEventListener('click', () => {
                chartManager.createChartsModal();
            });
        }

        // 데이터관리 버튼
        const dataManagerBtn = document.getElementById('data-manager-btn');
        if (dataManagerBtn) {
            dataManagerBtn.addEventListener('click', () => {
                dataManager.showDataManager();
            });
        }
    }

    // 툴팁 이벤트 설정 (마우스오버/아웃)
    setupTooltipEvents() {
        document.querySelectorAll('.moneymove-tooltip').forEach(tooltip => {
            const content = tooltip.querySelector('.tooltip-content');
            if (content) {
                tooltip.addEventListener('mouseenter', () => {
                    content.style.visibility = 'visible';
                    content.style.opacity = '1';
                });
                
                tooltip.addEventListener('mouseleave', () => {
                    content.style.visibility = 'hidden';
                    content.style.opacity = '0';
                });
            }
        });
    }

    // 모달 기본 템플릿 생성
    createModalTemplate(id, title, content, isWide = false) {
        const overlay = document.createElement('div');
        overlay.id = id + '-overlay';
        overlay.className = 'mm-modal-overlay';

        const modal = document.createElement('div');
        modal.id = id;
        modal.className = `mm-modal ${isWide ? 'mm-modal-wide' : ''}`;

        modal.innerHTML = `
            <div class="mm-modal-header">
                <h3 class="mm-modal-title">${title}</h3>
                <button id="close-${id}-btn" class="mm-modal-close">×</button>
            </div>
            <div class="mm-modal-content">
                ${content}
            </div>
        `;

        overlay.appendChild(modal);
        return overlay;
    }

    // 모달 이벤트 리스너 설정 (닫기, 오버레이 클릭)
    setupModalEventListeners(overlay, modalId) {
        // 닫기 버튼
        const closeBtn = overlay.querySelector(`#close-${modalId}-btn`);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                overlay.remove();
            });
        }

        // 오버레이 클릭시 닫기
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    // 알림 메시지 표시
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `mm-notification mm-notification-${type}`;
        notification.textContent = message;
        
        // 스타일 적용
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            zIndex: '10001',
            opacity: '0',
            transform: 'translateY(-10px)',
            transition: 'all 0.3s ease'
        });

        // 타입별 배경색 설정
        const colors = {
            info: '#17a2b8',
            success: '#28a745',
            warning: '#fd7e14',
            error: '#dc3545'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 애니메이션으로 표시
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // 자동 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);

        return notification;
    }

    // 확인 대화상자
    showConfirmDialog(message, onConfirm, onCancel = null) {
        const result = confirm(message);
        if (result && onConfirm) {
            onConfirm();
        } else if (!result && onCancel) {
            onCancel();
        }
        return result;
    }

    // 입력 대화상자 (간단한 prompt 대체)
    showInputDialog(message, defaultValue = '', onSubmit = null) {
        const result = prompt(message, defaultValue);
        if (result !== null && onSubmit) {
            onSubmit(result);
        }
        return result;
    }

    // 페이지에 스타일 추가 (동적 CSS 주입)
    injectCustomStyles() {
        const existingStyle = document.getElementById('moneymove-custom-styles');
        if (existingStyle) {
            return; // 이미 주입됨
        }

        const style = document.createElement('style');
        style.id = 'moneymove-custom-styles';
        style.textContent = `
            .mm-notification {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                max-width: 350px;
                word-wrap: break-word;
            }
            
            .mm-fade-in {
                animation: mmFadeIn 0.3s ease-in;
            }
            
            .mm-slide-up {
                animation: mmSlideUp 0.5s ease-out;
            }
            
            @keyframes mmFadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes mmSlideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        
        document.head.appendChild(style);
    }

    // 초기화 함수
    init() {
        this.injectCustomStyles();
    }
}

// 전역으로 노출
window.UIComponents = UIComponents;