// 负责所有与 DOM 操作和 UI 更新相关的逻辑
import { state } from './state.js';

const topicsPanel = document.getElementById('topics-panel');
const agentsPanel = document.getElementById('agents-panel');
const agentList = document.querySelector('.agent-list');
const agentModal = document.getElementById('agent-modal');

export function initUI() {
    console.log('UI 模块初始化...');
    // 默认显示话题面板
    showTopicsPanel();
    renderAgents();
}

export function showTopicsPanel() {
    topicsPanel.classList.remove('hidden');
    agentsPanel.classList.add('hidden');
}

export function showAgentsPanel() {
    agentsPanel.classList.remove('hidden');
    topicsPanel.classList.add('hidden');
}

export function renderAgents() {
    agentList.innerHTML = ''; // 清空现有列表
    state.agents.forEach(agent => {
        const li = document.createElement('li');
        li.className = 'agent-item';
        li.innerHTML = `
            <div class="agent-name">${agent.name}</div>
            <div class="agent-description">${agent.description}</div>
        `;
        agentList.appendChild(li);
    });
}

export function openAgentModal() {
    agentModal.classList.remove('hidden');
}

export function closeAgentModal() {
    agentModal.classList.add('hidden');
}

// 可以在这里添加更多函数来更新 UI，例如：
// export function renderTopics(topics) { ... }
// export function addMessage(message) { ... }