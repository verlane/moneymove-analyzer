// MoneyMove 분석기 팝업 스크립트

// DOM 요소들
const elements = {
    pageEnabled: document.getElementById('page-enabled')
};

// 설정 키
const EXTENSION_ENABLED_KEY = 'moneyMoveExtensionEnabled';

// 스토리지 헬퍼 함수들
async function getExtensionEnabled() {
    try {
        const result = await chrome.storage.sync.get([EXTENSION_ENABLED_KEY]);
        return result[EXTENSION_ENABLED_KEY] !== false; // 기본값 true
    } catch (error) {
        console.error('설정 읽기 실패:', error);
        return true; // 기본값
    }
}

async function setExtensionEnabled(enabled) {
    try {
        await chrome.storage.sync.set({ [EXTENSION_ENABLED_KEY]: enabled });
        console.log('확장 프로그램 상태 저장:', enabled);
        
        // 현재 탭이 대상 페이지인 경우 새로고침
        const tab = await getCurrentTab();
        if (tab && tab.url.includes('moneymove.ai/invest/my-page/bond/overdue')) {
            chrome.tabs.reload(tab.id);
        }
    } catch (error) {
        console.error('설정 저장 실패:', error);
    }
}

// 현재 탭 정보 가져오기
async function getCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab;
    } catch (error) {
        console.error('탭 정보 가져오기 실패:', error);
        return null;
    }
}

// 체크박스 상태 업데이트
async function updateCheckbox() {
    const enabled = await getExtensionEnabled();
    elements.pageEnabled.checked = enabled;
}

// 체크박스 이벤트 핸들러
async function handleCheckboxChange() {
    const enabled = elements.pageEnabled.checked;
    await setExtensionEnabled(enabled);
    console.log('연체 정보 표시:', enabled ? 'ON' : 'OFF');
}

// 이벤트 리스너 등록
function setupEventListeners() {
    elements.pageEnabled.addEventListener('change', handleCheckboxChange);
}

// 버전 정보 표시
function displayVersion() {
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('version-display');
    if (versionElement) {
        versionElement.textContent = `v${manifest.version}`;
    }
}

// 초기화
async function init() {
    displayVersion();
    await updateCheckbox();
    setupEventListeners();
    
    console.log('MoneyMove 분석기 팝업 초기화 완료');
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', init);