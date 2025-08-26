// chart-manager.js - 차트 생성 및 관리 모듈

class ChartManager {
    constructor() {
        this.currentViewMode = 'monthly';
        this.monthlyData = null;
    }

    // 차트 모달 생성 및 표시
    async createChartsModal() {
        // 기존 차트 오버레이가 있으면 제거
        const existingOverlay = document.getElementById('moneymove-charts-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // 차트 오버레이 생성
        const chartsOverlay = document.createElement('div');
        chartsOverlay.id = 'moneymove-charts-overlay';
        chartsOverlay.className = 'mm-modal-overlay';

        // 차트 컨테이너 생성
        const chartsContainer = document.createElement('div');
        chartsContainer.id = 'moneymove-charts-container';
        chartsContainer.className = 'mm-modal mm-modal-charts';

        chartsContainer.innerHTML = this.getChartModalHTML();

        // 오버레이에 컨테이너 추가하고 body에 오버레이 추가
        chartsOverlay.appendChild(chartsContainer);
        document.body.appendChild(chartsOverlay);

        // 이벤트 리스너 설정
        this.setupEventListeners(chartsOverlay);

        // 차트 초기화
        await this.initCharts();
    }

    // 차트 모달 HTML 생성
    getChartModalHTML() {
        return `
            <div class="mm-modal-header">
                <h3 class="mm-modal-title">📈 투자 분석 차트</h3>
                <button id="close-charts-btn" class="mm-modal-close">×</button>
            </div>
            <div class="mm-chart-controls">
                <div class="mm-chart-control-group">
                    <span class="mm-control-label">기간 표시:</span>
                    <button id="chart-view-monthly" class="mm-btn mm-btn-secondary mm-btn-small chart-view-btn active">월별</button>
                    <button id="chart-view-yearly" class="mm-btn mm-btn-secondary mm-btn-small chart-view-btn">년별</button>
                </div>
            </div>
            <div class="mm-charts-grid">
                <div class="mm-chart-item">
                    <h4>종합 대시보드</h4>
                    <canvas id="dashboardChart" width="350" height="250"></canvas>
                </div>
                <div class="mm-chart-item">
                    <h4>연체율 추이</h4>
                    <canvas id="overdueRateChart" width="350" height="250"></canvas>
                </div>
                <div class="mm-chart-item">
                    <h4>연체금액 추이</h4>
                    <canvas id="overdueAmountChart" width="350" height="250"></canvas>
                </div>
                <div class="mm-chart-item">
                    <h4>상환 예정 원금 추이</h4>
                    <canvas id="expectedRepaymentChart" width="350" height="250"></canvas>
                </div>
                <div class="mm-chart-item">
                    <h4>손실회복 기간</h4>
                    <canvas id="recoveryChart" width="350" height="250"></canvas>
                </div>
                <div class="mm-chart-item">
                    <h4>리스크 조정 수익률</h4>
                    <canvas id="riskAdjustedChart" width="350" height="250"></canvas>
                </div>
            </div>
        `;
    }

    // 이벤트 리스너 설정
    setupEventListeners(chartsOverlay) {
        // 닫기 버튼 이벤트
        document.getElementById('close-charts-btn').addEventListener('click', () => {
            document.getElementById('moneymove-charts-overlay').remove();
        });

        // 오버레이 클릭시 닫기
        chartsOverlay.addEventListener('click', (e) => {
            if (e.target === chartsOverlay) {
                chartsOverlay.remove();
            }
        });

        // 월별/년별 전환 이벤트
        document.getElementById('chart-view-monthly').addEventListener('click', async () => {
            if (this.currentViewMode !== 'monthly') {
                this.currentViewMode = 'monthly';
                await window.setStorageData('chartViewMode', 'monthly');
                this.updateViewButtons();
                // 최신 데이터 다시 가져오기
                this.monthlyData = await window.getMonthlyData();
                this.refreshAllCharts(this.filterDataByMode(this.monthlyData, this.currentViewMode));
            }
        });

        document.getElementById('chart-view-yearly').addEventListener('click', async () => {
            if (this.currentViewMode !== 'yearly') {
                this.currentViewMode = 'yearly';
                await window.setStorageData('chartViewMode', 'yearly');
                this.updateViewButtons();
                // 최신 데이터 다시 가져오기
                this.monthlyData = await window.getMonthlyData();
                this.refreshAllCharts(this.filterDataByMode(this.monthlyData, this.currentViewMode));
            }
        });
    }

    // 차트 초기화
    async initCharts() {
        // 전역 함수로 변환된 데이터 가져오기
        this.monthlyData = await window.getMonthlyData();

        // 데이터가 없으면 더미 데이터 사용
        if (!this.monthlyData) {
            this.monthlyData = this.getDefaultData();
        }
        

        // 저장된 뷰 모드 불러오기
        const savedMode = await window.getStorageData('chartViewMode');
        if (savedMode && (savedMode === 'monthly' || savedMode === 'yearly')) {
            this.currentViewMode = savedMode;
            this.updateViewButtons();
        }

        // 차트 생성
        const filteredData = this.filterDataByMode(this.monthlyData, this.currentViewMode);
        setTimeout(() => {
            this.createOverdueRateChart(filteredData);
            this.createChart('overdueAmountChart', '연체금액 (원)', filteredData.overdueAmount, '#ffb366', true, 'line', filteredData.labels);
            this.createChart('expectedRepaymentChart', '상환 예정 원금 (원)', filteredData.expectedRepayment, '#b19cd9', true, 'bar', filteredData.labels);
            this.createChart('recoveryChart', '회복기간 (개월)', filteredData.recoveryMonths, '#98d982', false, 'line', filteredData.labels);
            this.createChart('riskAdjustedChart', '리스크 조정 수익률 (%)', filteredData.riskAdjustedReturn, '#ff9999', false, 'line', filteredData.labels);
            this.createDashboardChart(filteredData);
        }, 100);
    }

    // 기본 더미 데이터
    getDefaultData() {
        return {
            labels: ['더미-01', '더미-02', '더미-03'],
            overdueRate: [2.1, 3.5, 4.8],
            overdueRateMin: [1.8, 3.0, 4.2],
            overdueRateMax: [2.5, 4.0, 5.5],
            overdueAmount: [85000, 143000, 198000],
            netProfit: [-45000, -23000, 12000],
            expectedRepayment: [4000000, 4100000, 4200000],
            recoveryMonths: [18, 15, 12],
            riskAdjustedReturn: [14.2, 13.8, 13.5]
        };
    }

    // 뷰 버튼 업데이트
    updateViewButtons() {
        document.querySelectorAll('.chart-view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('chart-view-' + this.currentViewMode).classList.add('active');
    }

    // 데이터 필터링 (월별/년별)
    filterDataByMode(data, mode) {
        if (mode === 'yearly') {
            const yearlyData = {};
            
            data.labels.forEach((label, index) => {
                const year = label.substring(0, 4);
                yearlyData[year] = {
                    overdueRate: data.overdueRate[index],
                    overdueRateMin: data.overdueRateMin[index],
                    overdueRateMax: data.overdueRateMax[index],
                    overdueAmount: data.overdueAmount[index],
                    netProfit: data.netProfit[index],
                    expectedRepayment: data.expectedRepayment[index],
                    recoveryMonths: data.recoveryMonths[index],
                    riskAdjustedReturn: data.riskAdjustedReturn[index]
                };
            });
            
            const years = Object.keys(yearlyData).sort();
            return {
                labels: years,
                overdueRate: years.map(year => yearlyData[year].overdueRate),
                overdueRateMin: years.map(year => yearlyData[year].overdueRateMin),
                overdueRateMax: years.map(year => yearlyData[year].overdueRateMax),
                overdueAmount: years.map(year => yearlyData[year].overdueAmount),
                netProfit: years.map(year => yearlyData[year].netProfit),
                expectedRepayment: years.map(year => yearlyData[year].expectedRepayment),
                recoveryMonths: years.map(year => yearlyData[year].recoveryMonths),
                riskAdjustedReturn: years.map(year => yearlyData[year].riskAdjustedReturn)
            };
        }
        return data;
    }

    // 모든 차트 새로고침
    refreshAllCharts(data) {
        const canvasIds = ['overdueRateChart', 'overdueAmountChart', 'expectedRepaymentChart', 'recoveryChart', 'riskAdjustedChart', 'dashboardChart'];
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
        });
        
        setTimeout(() => {
            this.createOverdueRateChart(data);
            this.createChart('overdueAmountChart', '연체금액 (원)', data.overdueAmount, '#ffb366', true, 'line', data.labels);
            this.createChart('expectedRepaymentChart', '상환 예정 원금 (원)', data.expectedRepayment, '#b19cd9', true, 'bar', data.labels);
            this.createChart('recoveryChart', '회복기간 (개월)', data.recoveryMonths, '#98d982', false, 'line', data.labels);
            this.createChart('riskAdjustedChart', '리스크 조정 수익률 (%)', data.riskAdjustedReturn, '#ff9999', false, 'line', data.labels);
            this.createDashboardChart(data);
        }, 100);
    }

    // 연체율 전용 차트 (3개 라인)
    createOverdueRateChart(data) {
        const ctx = document.getElementById('overdueRateChart').getContext('2d');
        
        
        // 데이터 안전성 검사 및 기본값 설정
        if (!data || !data.overdueRate || !Array.isArray(data.overdueRate)) {
            console.error('Overdue rate chart data is invalid:', data);
            return;
        }
        
        // overdueRateMin, overdueRateMax가 없으면 overdueRate로 대체
        if (!data.overdueRateMin || !Array.isArray(data.overdueRateMin)) {
            data.overdueRateMin = data.overdueRate.map(rate => rate);
        }
        if (!data.overdueRateMax || !Array.isArray(data.overdueRateMax)) {
            data.overdueRateMax = data.overdueRate.map(rate => rate);
        }
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '최소 (%)',
                        data: data.overdueRateMin,
                        borderColor: '#98d982',
                        backgroundColor: '#98d98230',
                        tension: 0.4,
                        pointBackgroundColor: '#98d982',
                        pointBorderColor: '#98d982',
                        pointBorderWidth: 2,
                        borderWidth: 2
                    },
                    {
                        label: '현재 (%)',
                        data: data.overdueRate,
                        borderColor: '#87ceeb',
                        backgroundColor: '#87ceeb20',
                        tension: 0.4,
                        pointBackgroundColor: '#87ceeb',
                        pointBorderColor: '#87ceeb',
                        pointBorderWidth: 2,
                        borderWidth: 3
                    },
                    {
                        label: '최대 (%)',
                        data: data.overdueRateMax,
                        borderColor: '#ffb366',
                        backgroundColor: '#ffb36620',
                        tension: 0.4,
                        pointBackgroundColor: '#ffb366',
                        pointBorderColor: '#ffb366',
                        pointBorderWidth: 2,
                        borderWidth: 2
                    }
                ]
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
                                return context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);
                                
                                labels.forEach(label => {
                                    label.lineWidth = 1;
                                });
                                
                                return labels;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // 일반 차트 생성
    createChart(canvasId, label, data, color, isCurrency = false, chartType = 'line', customLabels = null) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // 데이터 안전성 검사
        if (!data || !Array.isArray(data)) {
            console.error(`Chart ${canvasId} data is invalid:`, data);
            return;
        }
        
        let backgroundColor = color + '20';
        let borderColor = color;
        
        if (canvasId === 'netProfitChart') {
            backgroundColor = data.map(value => value >= 0 ? '#ff99994D' : '#ff99994D');
            borderColor = data.map(value => value >= 0 ? '#ff9999' : '#ff9999');
        }
        
        new Chart(ctx, {
            type: chartType,
            data: {
                labels: customLabels || this.monthlyData.labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: borderColor,
                    backgroundColor: backgroundColor,
                    borderWidth: chartType === 'bar' ? 1 : 2,
                    tension: chartType === 'line' ? 0.4 : 0,
                    pointBackgroundColor: chartType === 'line' ? (Array.isArray(borderColor) ? borderColor : color) : undefined,
                    pointBorderColor: chartType === 'line' ? (Array.isArray(borderColor) ? borderColor : color) : undefined,
                    pointBorderWidth: chartType === 'line' ? 2 : undefined
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                animation: {
                    duration: chartType === 'bar' ? 1000 : 750,
                    easing: chartType === 'bar' ? 'easeOutBounce' : 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        labels: {
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);
                                
                                labels.forEach(label => {
                                    label.lineWidth = 1;
                                });
                                
                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (isCurrency) {
                                    // 금액을 원 단위로 표시
                                    return context.parsed.y.toLocaleString() + '원';
                                } else {
                                    // 개월은 소수점 1자리(후행 0 제거), 퍼센트는 소수점 2자리로 표시
                                    if (label.includes('개월')) {
                                        // parseFloat로 후행 0 제거 (13.50 -> 13.5)
                                        return parseFloat(context.parsed.y.toFixed(1)) + '개월';
                                    } else {
                                        return context.parsed.y.toFixed(2) + '%';
                                    }
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                if (isCurrency) {
                                    // 금액을 만원 단위로 변환하여 표시
                                    const manWon = value / 10000;
                                    if (value === 0) {
                                        return '0원';
                                    }
                                    return manWon.toLocaleString() + '만원';
                                } else {
                                    // 개월은 정수로, 퍼센트는 소수점 1자리로 표시
                                    if (label.includes('개월')) {
                                        return value.toFixed(0) + '개월';
                                    } else {
                                        return value.toFixed(1) + '%';
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // 종합 대시보드 차트
    createDashboardChart(data) {
        const ctx = document.getElementById('dashboardChart').getContext('2d');
        
        // 데이터 안전성 검사
        if (!data || !data.netProfit || !Array.isArray(data.netProfit)) {
            console.error('Dashboard chart data is invalid:', data);
            return;
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: '연체율 (%)',
                        data: data.overdueRate,
                        borderColor: '#87ceeb',
                        backgroundColor: '#87ceeb20',
                        yAxisID: 'y',
                        type: 'line',
                        tension: 0.4,
                        pointBackgroundColor: '#87ceeb',
                        pointBorderColor: '#87ceeb',
                        pointBorderWidth: 2
                    },
                    {
                        label: '순수익 (원)',
                        data: data.netProfit.map(v => v / 10000),
                        backgroundColor: data.netProfit.map(v => v >= 0 ? '#ff99994D' : '#ff99994D'),
                        borderColor: data.netProfit.map(v => v >= 0 ? '#ff9999' : '#ff9999'),
                        borderWidth: 1,
                        type: 'bar',
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
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        labels: {
                            generateLabels: function(chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);
                                
                                labels.forEach(label => {
                                    label.lineWidth = 1;
                                });
                                
                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return context.parsed.y.toFixed(2) + '%';
                                } else {
                                    // 만원 단위 데이터를 원 단위로 변환하여 표시
                                    const won = context.parsed.y * 10000;
                                    return won.toLocaleString() + '원';
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            callback: function(value) {
                                // 이미 만원 단위로 변환된 데이터
                                if (value === 0) {
                                    return '0원';
                                }
                                return value.toFixed(0) + '만원';
                            }
                        }
                    }
                }
            }
        });
    }
}

// 전역으로 노출
window.ChartManager = ChartManager;