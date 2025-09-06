// 负责与 localStorage 的交互，实现数据持久化

const STATE_KEY = 'ai-chat-app-state';

/**
 * 从 localStorage 加载状态
 * @returns {object | null}
 */
export function loadState() {
    try {
        const serializedState = localStorage.getItem(STATE_KEY);
        if (serializedState === null) {
            return null; // 没有找到保存的状态
        }
        return JSON.parse(serializedState);
    } catch (err) {
        console.error("无法加载状态", err);
        return null;
    }
}

/**
 * 将当前状态保存到 localStorage
 * @param {object} state
 */
export function saveState(state) {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(STATE_KEY, serializedState);
    } catch (err) {
        console.error("无法保存状态", err);
    }
}