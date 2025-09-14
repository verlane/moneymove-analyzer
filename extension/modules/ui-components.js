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

    // 요약 박스 생성
    async createSummaryBox(metrics, monthMinMax = '') {
        // 손실률 설정 로드
        const lossSettings = await this.loadLossRateSettings();
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'mm-summary';

        summaryDiv.innerHTML = `
            <div class="mm-summary-content">
                <!-- 핵심 정보 (첫 번째 줄) -->
                <div class="mm-summary-row">
                    <span class="moneymove-tooltip">
                        연체율: <span class="text-primary">${metrics.overdueRate}${metrics.dataNotAvailable ? '' : '%'}</span> ${monthMinMax}
                        <div class="tooltip-content">연체금액 ÷ 상환 예정 원금 × 100<br>${metrics.overdueAmount.toLocaleString()} ÷ ${metrics.expectedRepaymentPrincipal ? metrics.expectedRepaymentPrincipal.toLocaleString() : '?'} × 100</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        연체금액: <span class="text-primary">${metrics.overdueAmount.toLocaleString()}원</span>
                        <div class="tooltip-content">연체 투자금액 합계 - 연체 지급금액 합계<br>${metrics.totalInvestment.toLocaleString()} - ${metrics.totalPayment.toLocaleString()}</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        순수익: ${metrics.netProfit !== null ? (metrics.netProfit >= 0 ? '<span class="text-danger">' : '<span class="text-primary">') + metrics.netProfit.toLocaleString() + '원</span>' : '?'}
                        <div class="tooltip-content">누적 수익액 - 연체금액<br>${metrics.cumulativeProfit ? metrics.cumulativeProfit.toLocaleString() : '?'} - ${metrics.overdueAmount.toLocaleString()}</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        회복기간: ${metrics.monthsToRecoverLoss ? metrics.monthsToRecoverLoss + '개월' : '?'}
                        <div class="tooltip-content">리스크 조정 수익률 기준 실제 회복 기간<br>${metrics.overdueAmount.toLocaleString()} ÷ 실제 월수익 ${metrics.netMonthlyProfit ? Math.floor(metrics.netMonthlyProfit).toLocaleString() : '?'}원</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        <button id="charts-btn" class="mm-btn-link">📈 차트</button>
                        <div class="tooltip-content">1년간 월별 투자 분석 차트<br>• 연체율, 연체 금액, 순수익 추이<br>• 회복 기간, 리스크 조정 수익률<br>• 종합 대시보드 (마우스 오버로 상세 데이터)</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        <button id="data-manager-btn" class="mm-btn-link">🗂️ 관리</button>
                        <div class="tooltip-content">월별 데이터 관리<br>• 저장된 데이터 보기/편집<br>• 데이터 초기화<br>• 수동 입력</div>
                    </span>
                </div>

                <!-- 연체 현황 테이블 (두 번째 줄) -->
                ${metrics.statusBreakdown ? `
                <div class="mm-summary-section">
                    <span class="mm-summary-section-title">연체현황:</span>
                    <div class="mm-status-table">
                        <table class="mm-table">
                            <thead>
                                <tr>
                                    <th>상태</th>
                                    <th>투자금액</th>
                                    <th>지급금액</th>
                                    <th>연체금액</th>
                                    <th>지급률</th>
                                    <th>예상 손실률</th>
                                    <th>예상 손실액</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${metrics.statusBreakdown['상환지연'].count > 0 ? `
                                <tr>
                                    <td><button class="mm-status-filter-btn" data-status="상환지연">상환지연(${metrics.statusBreakdown['상환지연'].count}건)</button></td>
                                    <td>${(metrics.statusBreakdown['상환지연'].totalInvestment || 0).toLocaleString()}원</td>
                                    <td>${(metrics.statusBreakdown['상환지연'].totalPayment || 0).toLocaleString()}원</td>
                                    <td class="text-primary">${metrics.statusBreakdown['상환지연'].amount.toLocaleString()}원</td>
                                    <td>${metrics.statusBreakdown['상환지연'].totalInvestment ? ((metrics.statusBreakdown['상환지연'].totalPayment || 0) / metrics.statusBreakdown['상환지연'].totalInvestment * 100).toFixed(1) : '0.0'}%</td>
                                    <td>${lossSettings.delayLossRate}%</td>
                                    <td class="text-primary">${Math.round(metrics.statusBreakdown['상환지연'].amount * lossSettings.delayLossRate / 100).toLocaleString()}원</td>
                                </tr>` : ''}
                                ${metrics.statusBreakdown['단기연체'].count > 0 ? `
                                <tr>
                                    <td><button class="mm-status-filter-btn" data-status="단기연체">단기연체(${metrics.statusBreakdown['단기연체'].count}건)</button></td>
                                    <td>${(metrics.statusBreakdown['단기연체'].totalInvestment || 0).toLocaleString()}원</td>
                                    <td>${(metrics.statusBreakdown['단기연체'].totalPayment || 0).toLocaleString()}원</td>
                                    <td class="text-primary">${metrics.statusBreakdown['단기연체'].amount.toLocaleString()}원</td>
                                    <td>${metrics.statusBreakdown['단기연체'].totalInvestment ? ((metrics.statusBreakdown['단기연체'].totalPayment || 0) / metrics.statusBreakdown['단기연체'].totalInvestment * 100).toFixed(1) : '0.0'}%</td>
                                    <td>${lossSettings.shortOverdueLossRate}%</td>
                                    <td class="text-primary">${Math.round(metrics.statusBreakdown['단기연체'].amount * lossSettings.shortOverdueLossRate / 100).toLocaleString()}원</td>
                                </tr>` : ''}
                                ${metrics.statusBreakdown['개인회생'].count > 0 ? `
                                <tr class="mm-danger-row">
                                    <td><button class="mm-status-filter-btn" data-status="개인회생">개인회생(${metrics.statusBreakdown['개인회생'].count}건)</button></td>
                                    <td>${(metrics.statusBreakdown['개인회생'].totalInvestment || 0).toLocaleString()}원</td>
                                    <td>${(metrics.statusBreakdown['개인회생'].totalPayment || 0).toLocaleString()}원</td>
                                    <td class="text-primary">${metrics.statusBreakdown['개인회생'].amount.toLocaleString()}원</td>
                                    <td>${metrics.statusBreakdown['개인회생'].totalInvestment ? ((metrics.statusBreakdown['개인회생'].totalPayment || 0) / metrics.statusBreakdown['개인회생'].totalInvestment * 100).toFixed(1) : '0.0'}%</td>
                                    <td>${lossSettings.bankruptcyLossRate}%</td>
                                    <td class="text-primary">${Math.round(metrics.statusBreakdown['개인회생'].amount * lossSettings.bankruptcyLossRate / 100).toLocaleString()}원</td>
                                </tr>` : ''}
                                <tr class="mm-total-row">
                                    <td><strong><button class="mm-status-filter-btn mm-status-all" data-status="전체">합계(${Object.values(metrics.statusBreakdown).reduce((sum, item) => sum + item.count, 0)}건)</button></strong></td>
                                    <td><strong>${metrics.totalInvestment.toLocaleString()}원</strong></td>
                                    <td><strong>${metrics.totalPayment.toLocaleString()}원</strong></td>
                                    <td class="text-primary"><strong>${metrics.overdueAmount.toLocaleString()}원</strong></td>
                                    <td><strong>${metrics.paymentRatio}%</strong></td>
                                    <td><strong>${(metrics.expectedLoss / metrics.overdueAmount * 100).toFixed(1)}%</strong></td>
                                    <td class="text-primary"><strong>${metrics.expectedLoss.toLocaleString()}원</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}

                <!-- 손실 예상 분석 (세 번째 줄) -->
                ${metrics.expectedLoss ? `
                <div class="mm-summary-section">
                    <span class="mm-summary-section-title">손실예상:</span>
                    <span class="moneymove-tooltip">
                        손실액 <span class="${metrics.expectedLoss > metrics.overdueAmount * 0.5 ? 'text-primary' : ''}">${metrics.expectedLoss.toLocaleString()}원</span>
                        <div class="tooltip-content">상태별 가중 손실 예상액<br>상환지연 ${lossSettings.delayLossRate}% + 단기연체 ${lossSettings.shortOverdueLossRate}%<br>+ 개인회생 ${lossSettings.bankruptcyLossRate}%</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        손실률 <span class="${parseFloat(metrics.actualLossRate) > 3 ? 'text-primary' : ''}">${metrics.actualLossRate}%</span>
                        <div class="tooltip-content">예상 손실액 ÷ 상환 예정 원금 × 100<br>${metrics.expectedLoss.toLocaleString()} ÷ ${metrics.expectedRepaymentPrincipal.toLocaleString()} × 100</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        순수익 ${metrics.expectedNetProfit !== null ? (metrics.expectedNetProfit >= 0 ? '<span class="text-danger">' : '<span class="text-primary">') + metrics.expectedNetProfit.toLocaleString() + '원</span>' : '?'}
                        <div class="tooltip-content">누적 수익액 - 예상 손실액<br>${metrics.cumulativeProfit ? metrics.cumulativeProfit.toLocaleString() : '?'} - ${metrics.expectedLoss.toLocaleString()}</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        회복기간 ${metrics.expectedMonthsToRecoverLoss ? metrics.expectedMonthsToRecoverLoss + '개월' : '?'}
                        <div class="tooltip-content">예상 손실액 기준 회복 기간<br>${metrics.expectedLoss.toLocaleString()} ÷ 실제 월수익 ${metrics.netMonthlyProfit ? Math.floor(metrics.netMonthlyProfit).toLocaleString() : '?'}원</div>
                    </span>
                </div>
                ` : ''}

                <!-- 투자현황 정보 (네 번째 줄) -->
                ${!metrics.dataNotAvailable ? `
                <div class="mm-portfolio-section">
                    <span class="mm-summary-section-title">투자현황:</span>
                    <span class="moneymove-tooltip">
                        상환 예정 원금 ${metrics.expectedRepaymentPrincipal.toLocaleString()}원
                        <div class="tooltip-content">투자한 모든 원리금수취권의<br>원금 총합 (메인페이지 데이터)</div>
                    </span> = 
                    <span class="moneymove-tooltip">
                        정상 ${metrics.normalInvestment ? metrics.normalInvestment.toLocaleString() + '원' : '?'}
                        <div class="tooltip-content">상환 예정 원금 - 연체 금액<br>${metrics.expectedRepaymentPrincipal.toLocaleString()} - ${metrics.overdueAmount.toLocaleString()}</div>
                    </span> + 
                    <span class="moneymove-tooltip">
                        연체 ${metrics.overdueAmount.toLocaleString()}원
                        <div class="tooltip-content">연체금액 (연체투자금 - 연체지급금)</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        누적 수익액 ${metrics.cumulativeProfit ? metrics.cumulativeProfit.toLocaleString() + '원' : '?'}
                        <div class="tooltip-content">전체 투자로부터 얻은<br>누적 순수익액 (메인페이지)</div>
                    </span> | 
                    <span class="moneymove-tooltip">
                        예상 수익률 ${metrics.expectedYield ? metrics.expectedYield + '%' : '?'}(${metrics.riskAdjustedReturn ? metrics.riskAdjustedReturn + '%' : '?'})
                        <div class="tooltip-content">기본 예상 수익률: ${metrics.expectedYield ? metrics.expectedYield + '%' : '?'}<br>리스크 조정 수익률: ${metrics.riskAdjustedReturn ? metrics.riskAdjustedReturn + '%' : '?'}<br>= ${metrics.expectedYield ? metrics.expectedYield : '?'}% × (1 - ${metrics.overdueRatio ? metrics.overdueRatio : '?'}%)<br>(연체 비중을 반영한 실제 수익률)</div>
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

        // 상태별 필터링 버튼들
        this.setupStatusFilterEvents();
    }

    // 상태별 필터링 이벤트 설정
    setupStatusFilterEvents() {
        const filterButtons = document.querySelectorAll('.mm-status-filter-btn');
        let currentFilter = null; // 현재 활성 필터 추적

        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const status = button.getAttribute('data-status');

                // 약간의 지연을 주어 깜빡임 방지
                setTimeout(() => {
                    this.toggleStatusFilter(button, status);
                }, 10);
            });
        });
    }

    // 상태 필터 토글 (라디오 버튼 방식 - 하나만 선택, 해제 가능)
    toggleStatusFilter(clickedButton, status) {
        // 연체 테이블 찾기
        const overdueTable = document.querySelector('#bond-overdue .table-list table tbody') ||
                             document.querySelector('.table-list table tbody');

        if (overdueTable) {
            const rows = overdueTable.querySelectorAll('tr[id="note-row"]');

            // 현재 클릭된 버튼이 이미 활성화되어 있는지 확인
            const isCurrentlyActive = clickedButton.classList.contains('mm-active-filter');

            // 모든 버튼 스타일 초기화
            const allButtons = document.querySelectorAll('.mm-status-filter-btn');
            allButtons.forEach(btn => btn.classList.remove('mm-active-filter'));

            if (isCurrentlyActive) {
                // 같은 버튼 다시 클릭 → 해제 (모든 행 표시)
                rows.forEach(row => {
                    row.style.display = '';
                });
            } else {
                // 다른 버튼 클릭 → 해당 상태만 활성화
                clickedButton.classList.add('mm-active-filter');

                if (status === '전체') {
                    // 전체 선택 - 모든 행 표시
                    rows.forEach(row => {
                        row.style.display = '';
                    });
                } else {
                    // 특정 상태로 필터링
                    rows.forEach(row => {
                        // 상태는 6번째 td에 있음
                        let statusCell = row.querySelector('td:nth-child(6) .data-info');

                        if (statusCell) {
                            const statusText = statusCell.textContent.trim();
                            const isMatch = this.isStatusMatch(statusText, status);

                            if (isMatch) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        }
                    });
                }
            }
        }
    }

    // 상태 매칭 확인
    isStatusMatch(statusText, filterStatus) {
        switch(filterStatus) {
            case '상환지연':
                return statusText.includes('상환지연');
            case '단기연체':
                return statusText.includes('단기연체');
            case '개인회생':
                return statusText.includes('개인회생');
            default:
                return true;
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