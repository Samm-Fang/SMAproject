// 负责所有与 DOM 操作和 UI 更新相关的逻辑
import { state } from './state.js';

// --- DOM 元素引用 ---
const agentsPanel = document.getElementById('agents-panel');
const settingsPanel = document.getElementById('settings-panel');
const agentList = document.querySelector('.agent-list');
const serviceList = document.querySelector('.service-list');
const agentModal = document.getElementById('agent-modal');
const serviceModal = document.getElementById('service-modal');
const chatMessages = document.querySelector('.chat-messages');

// --- 初始化 ---
export function initUI() {
    console.log('UI 模块初始化...');
    showAgentsPanel(); // 默认显示智能体列表
    renderAgents();
    renderMessages();
    renderModelServices();
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
        li.innerHTML = `
            <div class="agent-name">${agent.name}</div>
            <button class="edit-btn">✏️</button>
        `;
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

export function renderModelServices() {
    serviceList.innerHTML = '';
    state.modelServices.forEach(service => {
        const li = document.createElement('li');
        li.className = 'service-item';
        li.dataset.id = service.id;
        li.innerHTML = `
            <div class="service-name">${service.name}</div>
            <div class="service-model">${service.modelId}</div>
        `;
        serviceList.appendChild(li);
    });
}

// --- 模态框逻辑 ---

function populateServiceSelector(selectedServiceId = null) {
    const selector = document.getElementById('agent-model-service');
    selector.innerHTML = ''; // 清空旧选项
    state.modelServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} (${service.modelId})`;
        if (service.id === selectedServiceId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

export function openAgentModal(agent = null) {
    const form = document.getElementById('agent-form');
    const title = agentModal.querySelector('h2'); // 从 modal 根元素查找 h2
    if (agent) {
        // 编辑模式
        title.textContent = '编辑智能体';
        form.dataset.editingId = agent.id;
        document.getElementById('agent-name').value = agent.name;
        document.getElementById('agent-description').value = agent.description || '';
        document.getElementById('agent-prompt').value = agent.prompt;
        populateServiceSelector(agent.modelServiceId);
    } else {
        // 创建模式
        title.textContent = '创建新智能体';
        delete form.dataset.editingId;
        form.reset();
        populateServiceSelector();
    }
    agentModal.classList.remove('hidden');
}

export function closeAgentModal() {
    agentModal.classList.add('hidden');
}

export function openServiceModelModal(service = null) {
    const form = document.getElementById('service-form');
    const title = serviceModal.querySelector('h2'); // 从 modal 根元素查找 h2
    if (service) {
        // 编辑模式
        title.textContent = '编辑模型服务';
        form.dataset.editingId = service.id;
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-api-url').value = service.apiUrl;
        document.getElementById('service-api-key').value = service.apiKey;
        document.getElementById('service-model-id').value = service.modelId;
    } else {
        // 创建模式
        title.textContent = '创建新模型服务';
        delete form.dataset.editingId;
        form.reset();
    }
    serviceModal.classList.remove('hidden');
}

export function closeServiceModelModal() {
    serviceModal.classList.add('hidden');
}