// 负责所有与 DOM 操作和 UI 更新相关的逻辑
import { state } from './state.js';

// --- DOM 元素引用 ---
const agentsPanel = document.getElementById('agents-panel');
const settingsPanel = document.getElementById('settings-panel');
const agentList = document.querySelector('.agent-list');
const agentModal = document.getElementById('agent-modal');
const chatMessages = document.querySelector('.chat-messages');

// --- 初始化 ---
export function initUI() {
    console.log('UI 模块初始化...');
    showAgentsPanel(); // 默认显示智能体列表
    renderAgents();
    renderMessages();
    loadSettingsForm(); // 加载保存的设置到表单
}

// --- 视图切换 ---
export function showAgentsPanel() {
    agentsPanel.classList.remove('hidden');
    settingsPanel.classList.add('hidden');
}

export function showSettingsPanel() {
    settingsPanel.classList.remove('hidden');
    agentsPanel.classList.add('hidden');
}

// --- 渲染函数 ---
export function renderAgents() {
    agentList.innerHTML = ''; // 清空
    state.agents.forEach(agent => {
        const li = document.createElement('li');
        li.className = 'agent-item';
        li.dataset.id = agent.id;
        if (agent.id === state.currentAgentId) {
            li.classList.add('active');
        }
        li.innerHTML = `<div class="agent-name">${agent.name}</div>`;
        agentList.appendChild(li);
    });
}

export function renderMessages() {
    chatMessages.innerHTML = ''; // 清空
    const currentMessages = state.messages[state.currentAgentId] || [];
    
    currentMessages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        if (message.author === state.currentUser.name) {
            messageEl.classList.add('user-message');
        }
        messageEl.innerHTML = `
            <div class="author">${message.author}</div>
            <div class="text">${message.text}</div>
        `;
        chatMessages.appendChild(messageEl);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- 模态框 ---
export function openAgentModal() {
    agentModal.classList.remove('hidden');
}

export function closeAgentModal() {
    agentModal.classList.add('hidden');
}

// --- 设置表单 ---
export function loadSettingsForm() {
    document.getElementById('default-api-url').value = state.settings.defaultApiUrl;
    document.getElementById('default-api-key').value = state.settings.defaultApiKey;
    document.getElementById('default-model-id').value = state.settings.defaultModelId;
}