// data-manager.js - 데이터 저장/관리/모달 모듈

class DataManager {
    constructor() {
        this.currentEditingMonth = null;
    }

    // 월별 데이터 저장
    async saveMonthlyData(overdueRate, overdueAmount, netProfit, expectedRepayment, monthsToRecoverLoss, riskAdjustedReturn) {
        const currentDate = new Date();
        const monthKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');

        // 기존 데이터 가져오기
        const existingDataString = await window.getStorageData('moneyMoveMonthlyData');
        const existingData = existingDataString ? JSON.parse(existingDataString) : {};
        const beforeCount = Object.keys(existingData).length;

        // 메인페이지 데이터도 함께 백업
        const mainPageData = {
            expectedRepaymentPrincipal: await window.getStorageData('expectedRepaymentPrincipal'),
            expectedYield: await window.getStorageData('expectedYield'),
            cumulativeProfit: await window.getStorageData('cumulativeProfit')
        };

        const currentOverdueRate = parseFloat(overdueRate) || 0;
        
        // 기존 월 데이터가 있으면 최소/최대값 업데이트
        if (existingData[monthKey]) {
            const existing = existingData[monthKey];
            existingData[monthKey] = {
                ...existing,
                overdueRate: currentOverdueRate,
                overdueRateMin: Math.min(existing.overdueRateMin || currentOverdueRate, currentOverdueRate),
                overdueRateMax: Math.max(existing.overdueRateMax || currentOverdueRate, currentOverdueRate),
                overdueAmount: overdueAmount || 0,
                netProfit: netProfit || 0,
                expectedRepayment: expectedRepayment || 0,
                monthsToRecoverLoss: monthsToRecoverLoss || 0,
                riskAdjustedReturn: parseFloat(riskAdjustedReturn) || 0,
                timestamp: Date.now(),
                backupData: mainPageData
            };
        } else {
            // 새 월 데이터 생성
            existingData[monthKey] = {
                date: monthKey,
                overdueRate: currentOverdueRate,
                overdueRateMin: currentOverdueRate,
                overdueRateMax: currentOverdueRate,
                overdueAmount: overdueAmount || 0,
                netProfit: netProfit || 0,
                expectedRepayment: expectedRepayment || 0,
                monthsToRecoverLoss: monthsToRecoverLoss || 0,
                riskAdjustedReturn: parseFloat(riskAdjustedReturn) || 0,
                timestamp: Date.now(),
                saveLocation: window.location.hostname,
                userAgent: navigator.userAgent.substring(0, 50) + '...',
                backupData: mainPageData
            };
        }

        // Storage에 저장
        await window.setStorageData('moneyMoveMonthlyData', JSON.stringify(existingData));
        
        const afterCount = Object.keys(existingData).length;
        const isNewMonth = afterCount > beforeCount;
        
        
        return {
            monthKey: monthKey,
            isNewMonth: isNewMonth,
            totalMonths: afterCount
        };
    }

    // 월별 데이터 조회
    async getMonthlyData() {
        const savedDataString = await window.getStorageData('moneyMoveMonthlyData');
        const savedData = savedDataString ? JSON.parse(savedDataString) : {};
        const months = Object.keys(savedData).sort();

        if (months.length === 0) {
            return null;
        }

        const recentMonths = months;
        const monthlyData = {
            labels: recentMonths,
            overdueRate: [],
            overdueRateMin: [],
            overdueRateMax: [],
            overdueAmount: [],
            netProfit: [],
            expectedRepayment: [],
            recoveryMonths: [],
            riskAdjustedReturn: []
        };

        recentMonths.forEach(month => {
            const data = savedData[month];
            monthlyData.overdueRate.push(data.overdueRate);
            monthlyData.overdueRateMin.push(data.overdueRateMin || data.overdueRate);
            monthlyData.overdueRateMax.push(data.overdueRateMax || data.overdueRate);
            monthlyData.overdueAmount.push(data.overdueAmount);
            monthlyData.netProfit.push(data.netProfit || 0);
            monthlyData.expectedRepayment.push(data.expectedRepayment || 4000000);
            monthlyData.recoveryMonths.push(data.monthsToRecoverLoss);
            monthlyData.riskAdjustedReturn.push(data.riskAdjustedReturn);
        });

        return monthlyData;
    }

    // 데이터 관리 모달 표시
    async showDataManager() {
        // 기존 오버레이가 있으면 제거
        const existingOverlay = document.getElementById('moneymove-data-manager-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // 저장된 데이터 가져오기
        const savedDataString = await window.getStorageData('moneyMoveMonthlyData');
        const savedData = savedDataString ? JSON.parse(savedDataString) : {};
        const months = Object.keys(savedData).sort();
        
        // 데이터 관리 오버레이 생성
        const managerOverlay = document.createElement('div');
        managerOverlay.id = 'moneymove-data-manager-overlay';
        managerOverlay.className = 'mm-modal-overlay';
        
        // 데이터 관리 창 생성
        const managerContainer = document.createElement('div');
        managerContainer.id = 'moneymove-data-manager';
        managerContainer.className = 'mm-modal mm-modal-wide';
        
        let dataRows = '';
        if (months.length > 0) {
            months.forEach(month => {
                const data = savedData[month];
                dataRows += 
                    '<tr>' +
                        '<td class="mm-table-cell">' + month + '</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + data.overdueRate.toFixed(2) + '%</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + (data.overdueRateMin || data.overdueRate).toFixed(2) + '%</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + (data.overdueRateMax || data.overdueRate).toFixed(2) + '%</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + data.overdueAmount.toLocaleString() + '원</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + (data.expectedRepayment || 4000000).toLocaleString() + '원</td>' +
                        '<td class="mm-table-cell mm-table-cell-right ' + ((data.netProfit || 0) >= 0 ? 'mm-table-cell-danger' : 'mm-table-cell-primary') + '">' + (data.netProfit || 0).toLocaleString() + '원</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + data.monthsToRecoverLoss + '개월</td>' +
                        '<td class="mm-table-cell mm-table-cell-right">' + data.riskAdjustedReturn.toFixed(2) + '%</td>' +
                        '<td class="mm-table-cell mm-table-cell-center">' +
                            '<button class="edit-month-btn mm-btn mm-btn-secondary mm-btn-small" data-month="' + month + '">수정</button> ' +
                            '<button class="delete-month-btn mm-btn mm-btn-danger mm-btn-small" data-month="' + month + '">삭제</button>' +
                        '</td>' +
                    '</tr>';
            });
        } else {
            dataRows = '<tr><td colspan="10" class="mm-table-empty">저장된 데이터가 없습니다</td></tr>';
        }
        
        managerContainer.innerHTML = this.getDataManagerHTML(dataRows, months.length);
        
        // 오버레이에 컨테이너 추가하고 body에 오버레이 추가
        managerOverlay.appendChild(managerContainer);
        document.body.appendChild(managerOverlay);
        
        // 이벤트 리스너 설정
        this.setupDataManagerEventListeners(managerOverlay);
    }

    // 데이터 관리 모달 HTML 생성
    getDataManagerHTML(dataRows, dataCount) {
        return `
            <div class="mm-modal-header">
                <h3 class="mm-modal-title">🗂️ 데이터관리</h3>
                <button id="close-manager-btn" class="mm-modal-close">×</button>
            </div>
            
            <div class="mm-section-divider">
                <button id="show-add-form-btn" class="mm-btn mm-btn-primary">추가</button>
                <button id="import-data-btn" class="mm-btn mm-btn-secondary">가져오기</button>
                <button id="export-data-btn" class="mm-btn mm-btn-secondary">내보내기</button>
                <button id="clear-all-data-btn" class="mm-btn mm-btn-danger">전체 삭제</button>
                <span class="mm-data-count">총 ${dataCount}개월 데이터</span>
            </div>
            
            <input type="file" id="import-file-input" accept=".json" style="display: none;">
            
            <div id="add-data-form" class="mm-form">
                <h4 class="mm-form-title">월별 데이터 추가</h4>
                <div class="mm-form-grid-2">
                    <div>
                        <label class="mm-form-label">월 (YYYY-MM)</label>
                        <input type="month" id="manual-month" class="mm-form-input mm-form-input-month">
                    </div>
                    <div>
                        <label class="mm-form-label">연체금액 (원)</label>
                        <input type="number" id="manual-overdue-amount" placeholder="314649" class="mm-form-input">
                    </div>
                </div>
                <div class="mm-form-grid-3">
                    <div>
                        <label class="mm-form-label">연체율 (%) <span class="text-danger">현재</span></label>
                        <input type="number" id="manual-overdue-rate" step="0.01" placeholder="7.62" class="mm-form-input">
                    </div>
                    <div>
                        <label class="mm-form-label">최소 연체율 (%) <span class="text-success">Min</span></label>
                        <input type="number" id="manual-overdue-rate-min" step="0.01" placeholder="6.85" class="mm-form-input">
                    </div>
                    <div>
                        <label class="mm-form-label">최대 연체율 (%) <span class="text-warning">Max</span></label>
                        <input type="number" id="manual-overdue-rate-max" step="0.01" placeholder="8.45" class="mm-form-input">
                    </div>
                </div>
                <div class="mm-form-grid-4">
                    <div>
                        <label class="mm-form-label">상환예정원금 (원)</label>
                        <input type="number" id="manual-expected-repayment" placeholder="4200000" class="mm-form-input">
                    </div>
                    <div>
                        <label class="mm-form-label">순수익 (원)</label>
                        <input type="number" id="manual-net-profit" placeholder="116754" class="mm-form-input">
                    </div>
                    <div>
                        <label class="mm-form-label">손실회복기간 (개월)</label>
                        <input type="number" id="manual-recovery-months" placeholder="9" class="mm-form-input">
                    </div>
                    <div>
                        <label class="mm-form-label">리스크조정수익률 (%)</label>
                        <input type="number" id="manual-risk-adjusted" step="0.01" placeholder="13.12" class="mm-form-input">
                    </div>
                </div>
                <div class="mm-form-actions">
                    <button id="cancel-form-btn" class="mm-btn mm-btn-secondary">취소</button>
                    <button id="save-manual-data-btn" class="mm-btn mm-btn-primary">저장</button>
                </div>
            </div>
            
            <div class="mm-scrollable">
                <table class="mm-table">
                    <thead>
                        <tr>
                            <th class="mm-table-header">월</th>
                            <th class="mm-table-header mm-table-header-right">연체율</th>
                            <th class="mm-table-header mm-table-header-right">최소</th>
                            <th class="mm-table-header mm-table-header-right">최대</th>
                            <th class="mm-table-header mm-table-header-right">연체금액</th>
                            <th class="mm-table-header mm-table-header-right">상환예정원금</th>
                            <th class="mm-table-header mm-table-header-right">순수익</th>
                            <th class="mm-table-header mm-table-header-right">회복기간</th>
                            <th class="mm-table-header mm-table-header-right">리스크조정</th>
                            <th class="mm-table-header mm-table-header-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>${dataRows}</tbody>
                </table>
            </div>
            
            <div id="dev-mode-section" style="display: none; margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6; text-align: center;">
                <small style="color: #6c757d; margin-right: 10px;">개발 모드</small>
                <button id="add-test-data-btn" class="mm-btn mm-btn-secondary mm-btn-small">테스트 데이터</button>
                <button id="toggle-dev-mode-btn" class="mm-btn mm-btn-secondary mm-btn-small">개발 모드 OFF</button>
            </div>
        `;
    }

    // 데이터 관리 모달 이벤트 리스너 설정
    setupDataManagerEventListeners(managerOverlay) {
        // 닫기 버튼
        document.getElementById('close-manager-btn').addEventListener('click', () => {
            document.getElementById('moneymove-data-manager-overlay').remove();
        });

        // 오버레이 클릭시 닫기
        managerOverlay.addEventListener('click', (e) => {
            if (e.target === managerOverlay) {
                managerOverlay.remove();
            }
        });

        // 기능 버튼들
        document.getElementById('show-add-form-btn').addEventListener('click', () => this.showAddDataForm());
        document.getElementById('import-data-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importData(e));
        document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
        document.getElementById('clear-all-data-btn').addEventListener('click', () => this.clearAllData());

        // 폼 버튼들
        document.getElementById('save-manual-data-btn').addEventListener('click', () => this.saveFormData());
        document.getElementById('cancel-form-btn').addEventListener('click', () => this.hideAddDataForm());

        // 개발 모드 관련 (조건부)
        const testDataBtn = document.getElementById('add-test-data-btn');
        if (testDataBtn) {
            testDataBtn.addEventListener('click', () => this.generateTestData());
        }

        const toggleDevBtn = document.getElementById('toggle-dev-mode-btn');
        if (toggleDevBtn) {
            toggleDevBtn.addEventListener('click', () => this.toggleDevMode());
        }

        // 모달 제목 더블클릭으로 개발 모드 토글
        document.querySelector('.mm-modal-title').addEventListener('dblclick', () => {
            this.toggleDevMode();
        });

        // 편집/삭제 버튼들
        document.querySelectorAll('.edit-month-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editMonthData(e.target.dataset.month));
        });

        document.querySelectorAll('.delete-month-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteMonthData(e.target.dataset.month));
        });

        // 개발 모드 확인 및 표시
        this.checkAndShowDevMode();
    }

    // 개발 모드 확인 및 표시
    async checkAndShowDevMode() {
        const devModeResult = await window.getStorageData('moneyMoveDevMode');
        const isDevMode = devModeResult === 'true';
        
        if (isDevMode) {
            const devSection = document.getElementById('dev-mode-section');
            if (devSection) {
                devSection.style.display = 'block';
                document.getElementById('toggle-dev-mode-btn').textContent = '개발 모드 OFF';
            }
        }
    }

    // 개발 모드 토글
    async toggleDevMode() {
        const currentMode = await window.getStorageData('moneyMoveDevMode');
        const newMode = currentMode === 'true' ? 'false' : 'true';
        
        await window.setStorageData('moneyMoveDevMode', newMode);
        
        const devSection = document.getElementById('dev-mode-section');
        if (devSection) {
            if (newMode === 'true') {
                devSection.style.display = 'block';
                document.getElementById('toggle-dev-mode-btn').textContent = '개발 모드 OFF';
            } else {
                devSection.style.display = 'none';
                document.getElementById('toggle-dev-mode-btn').textContent = '개발 모드 ON';
            }
        }
    }

    // 데이터 추가 폼 표시
    showAddDataForm() {
        this.currentEditingMonth = null;
        const form = document.getElementById('add-data-form');
        form.style.display = 'block';
        
        // 폼 초기화 (원래 ID 사용)
        const currentDate = new Date();
        document.getElementById('manual-month').value = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');
        document.getElementById('manual-overdue-rate').value = '';
        document.getElementById('manual-overdue-rate-min').value = '';
        document.getElementById('manual-overdue-rate-max').value = '';
        document.getElementById('manual-overdue-amount').value = '';
        document.getElementById('manual-expected-repayment').value = '4000000';
        document.getElementById('manual-net-profit').value = '';
        document.getElementById('manual-recovery-months').value = '';
        document.getElementById('manual-risk-adjusted').value = '';
        
        document.querySelector('.mm-form-title').textContent = '월별 데이터 추가';
    }

    // 데이터 추가 폼 숨기기
    hideAddDataForm() {
        document.getElementById('add-data-form').style.display = 'none';
        this.currentEditingMonth = null;
    }

    // 폼 데이터 저장
    async saveFormData() {
        const month = document.getElementById('manual-month').value;
        const overdueRate = parseFloat(document.getElementById('manual-overdue-rate').value) || 0;
        const overdueRateMin = parseFloat(document.getElementById('manual-overdue-rate-min').value) || overdueRate;
        const overdueRateMax = parseFloat(document.getElementById('manual-overdue-rate-max').value) || overdueRate;
        const overdueAmount = parseInt(document.getElementById('manual-overdue-amount').value) || 0;
        const expectedRepayment = parseInt(document.getElementById('manual-expected-repayment').value) || 4000000;
        const netProfit = parseInt(document.getElementById('manual-net-profit').value) || 0;
        const recoveryMonths = parseFloat(document.getElementById('manual-recovery-months').value) || 0;
        const riskAdjustedReturn = parseFloat(document.getElementById('manual-risk-adjusted').value) || 0;

        if (!month) {
            alert('년월을 선택해주세요.');
            return;
        }

        const savedDataString = await window.getStorageData('moneyMoveMonthlyData');
        const savedData = savedDataString ? JSON.parse(savedDataString) : {};

        // 기존 데이터가 있고 편집 모드가 아닌 경우 확인창 표시
        if (savedData[month] && !this.currentEditingMonth) {
            if (!confirm(`${month} 월의 데이터가 이미 존재합니다.\n기존 데이터를 덮어쓰시겠습니까?`)) {
                return;
            }
        }

        savedData[month] = {
            date: month,
            overdueRate: overdueRate,
            overdueRateMin: overdueRateMin,
            overdueRateMax: overdueRateMax,
            overdueAmount: overdueAmount,
            netProfit: netProfit,
            expectedRepayment: expectedRepayment,
            monthsToRecoverLoss: recoveryMonths,
            riskAdjustedReturn: riskAdjustedReturn,
            timestamp: Date.now(),
            saveLocation: window.location.hostname,
            userAgent: navigator.userAgent.substring(0, 50) + '...',
            manualEntry: true
        };

        await window.setStorageData('moneyMoveMonthlyData', JSON.stringify(savedData));

        this.hideAddDataForm();
        await this.showDataManager();
    }

    // 월별 데이터 편집
    async editMonthData(month) {
        const dataString = await window.getStorageData('moneyMoveMonthlyData');
        const data = dataString ? JSON.parse(dataString) : {};
        const monthData = data[month];
        
        if (!monthData) {
            alert('해당 월의 데이터를 찾을 수 없습니다.');
            return;
        }
        
        // 폼을 표시하고 기존 데이터로 채우기
        this.showAddDataForm();
        this.currentEditingMonth = month;
        
        document.getElementById('manual-month').value = month;
        document.getElementById('manual-overdue-rate').value = monthData.overdueRate;
        document.getElementById('manual-overdue-rate-min').value = monthData.overdueRateMin || monthData.overdueRate;
        document.getElementById('manual-overdue-rate-max').value = monthData.overdueRateMax || monthData.overdueRate;
        document.getElementById('manual-overdue-amount').value = monthData.overdueAmount;
        document.getElementById('manual-expected-repayment').value = monthData.expectedRepayment || 4000000;
        document.getElementById('manual-net-profit').value = monthData.netProfit || 0;
        document.getElementById('manual-recovery-months').value = monthData.monthsToRecoverLoss;
        document.getElementById('manual-risk-adjusted').value = monthData.riskAdjustedReturn;
        
        document.querySelector('.mm-form-title').textContent = month + ' 데이터 수정';
    }

    // 월별 데이터 삭제
    async deleteMonthData(month) {
        if (confirm(`${month} 월의 데이터를 삭제하시겠습니까?`)) {
            const dataString = await window.getStorageData('moneyMoveMonthlyData');
            const data = dataString ? JSON.parse(dataString) : {};
            
            delete data[month];
            await window.setStorageData('moneyMoveMonthlyData', JSON.stringify(data));
            await this.showDataManager();
        }
    }

    // 모든 데이터 삭제
    async clearAllData() {
        if (confirm('모든 월별 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            await chrome.storage.local.remove(['moneyMoveMonthlyData']);
            await this.showDataManager();
        }
    }

    // 데이터 내보내기
    async exportData() {
        const data = await window.getStorageData('moneyMoveMonthlyData');
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
    }

    // 데이터 가져오기
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedData = JSON.parse(text);
            
            // 데이터 유효성 검사
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error('올바른 데이터 형식이 아닙니다.');
            }
            
            // 기존 데이터와 병합할지 확인
            const existingDataString = await window.getStorageData('moneyMoveMonthlyData');
            const existingData = existingDataString ? JSON.parse(existingDataString) : {};
            
            const hasExistingData = Object.keys(existingData).length > 0;
            let shouldMerge = false;
            
            if (hasExistingData) {
                shouldMerge = confirm('기존 데이터가 있습니다. 새 데이터와 병합하시겠습니까?\n\n예: 병합 (중복 월은 새 데이터로 덮어씀)\n아니오: 기존 데이터 삭제 후 새 데이터로 교체');
            }
            
            const finalData = shouldMerge ? { ...existingData, ...importedData } : importedData;
            
            await window.setStorageData('moneyMoveMonthlyData', JSON.stringify(finalData));
            
            // 파일 입력 초기화
            event.target.value = '';
            
            alert('데이터를 성공적으로 가져왔습니다.');
            await this.showDataManager();
            
        } catch (error) {
            alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
            event.target.value = '';
        }
    }

    // 테스트 데이터 생성
    async generateTestData() {
        if (!confirm('36개월분의 테스트 데이터를 생성하시겠습니까? 기존 데이터는 유지됩니다.')) {
            return;
        }

        const existingDataString = await window.getStorageData('moneyMoveMonthlyData');
        const existingData = existingDataString ? JSON.parse(existingDataString) : {};

        // 36개월 데이터 생성 (3년치)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 35); // 35개월 전부터 시작

        for (let i = 0; i < 36; i++) {
            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + i);
            const monthKey = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0');

            // 기존 데이터가 있으면 스킵
            if (existingData[monthKey]) {
                continue;
            }

            // 점진적으로 개선되는 데이터 생성
            const baseOverdueRate = Math.max(1.0, 8.0 - (i * 0.15) + (Math.random() - 0.5) * 0.8);
            const minOverdueRate = baseOverdueRate - Math.random() * 0.5;
            const maxOverdueRate = baseOverdueRate + Math.random() * 0.8;
            
            const overdueAmount = Math.max(10000, 800000 - (i * 15000) + (Math.random() - 0.5) * 100000);
            const expectedRepayment = 4000000 + (i * 10000) + (Math.random() - 0.5) * 200000;
            
            // 순수익: 처음엔 손실이지만 점차 개선되어 15만원까지
            const profitProgression = (i / 35) * 200000 - 50000; // -50000 에서 150000까지
            const netProfit = Math.round(profitProgression + (Math.random() - 0.5) * 30000);
            
            const recoveryMonths = Math.max(0.1, 24 - (i * 0.4) + (Math.random() - 0.5) * 3);
            const riskAdjustedReturn = Math.max(8.0, 16.0 - (i * 0.08) + (Math.random() - 0.5) * 1.0);

            existingData[monthKey] = {
                date: monthKey,
                overdueRate: parseFloat(baseOverdueRate.toFixed(2)),
                overdueRateMin: parseFloat(minOverdueRate.toFixed(2)),
                overdueRateMax: parseFloat(maxOverdueRate.toFixed(2)),
                overdueAmount: Math.round(overdueAmount),
                netProfit: netProfit,
                expectedRepayment: Math.round(expectedRepayment),
                monthsToRecoverLoss: parseFloat(recoveryMonths.toFixed(1)),
                riskAdjustedReturn: parseFloat(riskAdjustedReturn.toFixed(2)),
                timestamp: Date.now(),
                saveLocation: 'test-data',
                userAgent: 'TestDataGenerator',
                isTestData: true
            };
        }

        await window.setStorageData('moneyMoveMonthlyData', JSON.stringify(existingData));
        alert('36개월분의 테스트 데이터가 생성되었습니다.');
        await this.showDataManager();
    }
}

// 전역으로 노출
window.DataManager = DataManager;