// 负责所有与 DOM 操作和 UI 更新相关的逻辑
import { state, resetTokens } from './state.js'; // 导入 resetTokens

// --- DOM 元素引用 ---
const groupsPanel = document.getElementById('groups-panel');
const agentsPanel = document.getElementById('agents-panel');
const modelServicesPanel = document.getElementById('model-services-panel'); // 原 settingsPanel

// 列表容器引用
const groupList = document.querySelector('.group-list');
const topicList = document.querySelector('.topic-list'); // 现在是 groups-panel 内部的 topic-list
const agentList = document.querySelector('.agent-list');
const serviceList = document.querySelector('.service-list');


// 模态框引用
const agentModal = document.getElementById('agent-modal');
const serviceModal = document.getElementById('service-modal');
const groupModal = document.getElementById('group-modal');
const topicModal = document.getElementById('topic-modal');


// --- 初始化 ---
let chatMessages;
let chatInputArea;

export function initUI() {
    console.log('UI 模块初始化...');
    chatMessages = document.querySelector('.chat-messages');
    chatInputArea = document.querySelector('.chat-input-area');
    showGroupsPanel(); // 默认显示群组列表
    renderGroups();
    renderTopics(); // 渲染当前群组下的话题
    renderAgents();
    renderModelServices();
    renderMessages(); // 渲染当前话题的消息
    updateTokenStats(); // 初始化 token 统计显示
}

/**
 * 更新页面上显示的 token 统计数据
 */
export function updateTokenStats() {
    const inputTokensEl = document.getElementById('input-tokens');
    const outputTokensEl = document.getElementById('output-tokens');

    if (inputTokensEl) {
        inputTokensEl.textContent = state.totalInputTokens.toFixed(2); // 显示两位小数
    }
    if (outputTokensEl) {
        outputTokensEl.textContent = state.totalOutputTokens.toFixed(2); // 显示两位小数
    }
}

// --- 视图切换 ---
export function showGroupsPanel() {
    groupsPanel.classList.remove('hidden');
    agentsPanel.classList.add('hidden');
    modelServicesPanel.classList.add('hidden');
    updateChatAreaVisibility(); // 根据当前话题状态更新聊天区域可见性
}

export function showAgentsPanel() {
    groupsPanel.classList.add('hidden');
    agentsPanel.classList.remove('hidden');
    modelServicesPanel.classList.add('hidden');
    chatInputArea.classList.add('hidden'); // 智能体管理时隐藏聊天输入
}

export function showModelServicesPanel() {
    groupsPanel.classList.add('hidden');
    agentsPanel.classList.add('hidden');
    modelServicesPanel.classList.remove('hidden');
    chatInputArea.classList.add('hidden'); // 模型服务管理时隐藏聊天输入
}

// 根据当前是否有选中话题来控制聊天区域的可见性
export function updateChatAreaVisibility() {
    if (state.currentTopicId) {
        chatInputArea.classList.remove('hidden');
    } else {
        chatInputArea.classList.add('hidden');
    }
}


// --- 渲染函数 ---

export function renderGroups() {
    groupList.innerHTML = '';
    (state.groups || []).forEach(group => { // 添加防御性检查
        const li = document.createElement('li');
        li.className = 'group-item';
        li.dataset.id = group.id;
        if (group.id === state.currentGroupId) {
            li.classList.add('active');
        }
        li.innerHTML = `
            <div class="group-name">${group.name}</div>
            <div class="actions">
                <button class="edit-btn" title="编辑群组">✏️</button>
                <button class="delete-btn" title="删除群组">🗑️</button>
            </div>
        `;
        groupList.appendChild(li);
    });
}

export function renderTopics() {
    topicList.innerHTML = '';
    const currentGroupTopics = (state.topics || []).filter(t => t.groupId === state.currentGroupId);
    currentGroupTopics.forEach(topic => {
        const li = document.createElement('li');
        li.className = 'topic-item';
        li.dataset.id = topic.id;
        if (topic.id === state.currentTopicId) {
            li.classList.add('active');
        }
        li.innerHTML = `
            <div class="topic-name">${topic.name || '新话题'}</div>
            <div class="actions">
                <button class="edit-btn" title="编辑话题">✏️</button>
                <button class="delete-btn" title="删除话题">🗑️</button>
            </div>
        `;
        topicList.appendChild(li);
    });
}

export function renderAgents() {
    agentList.innerHTML = '';

    // 渲染发言统筹器
    const orchestratorAgent = state.orchestratorAgent;
    const orchestratorLi = document.createElement('li');
    orchestratorLi.className = 'agent-item orchestrator-agent-item';
    orchestratorLi.dataset.id = orchestratorAgent.id;
    orchestratorLi.innerHTML = `
        <div class="agent-name">${orchestratorAgent.name}</div>
        <div class="actions">
            <button class="edit-btn" title="编辑发言统筹器">⚙️</button>
        </div>
    `;
    agentList.appendChild(orchestratorLi);

    // 渲染普通智能体
    (state.agents || []).forEach(agent => {
        const li = document.createElement('li');
        li.className = 'agent-item';
        li.dataset.id = agent.id;
        if (agent.id === state.currentAgentId) {
            li.classList.add('active');
        }
        li.innerHTML = `
            <div class="agent-name">${agent.name}</div>
            <div class="actions">
                <button class="edit-btn" title="编辑智能体">✏️</button>
                <button class="delete-btn" title="删除智能体">🗑️</button>
            </div>
        `;
        agentList.appendChild(li);
    });
}

export function renderModelServices() {
    serviceList.innerHTML = '';
    (state.modelServices || []).forEach(service => { // 添加防御性检查
        const li = document.createElement('li');
        li.className = 'service-item';
        li.dataset.id = service.id;
        li.innerHTML = `
            <div class="service-name">${service.name}</div>
            <div class="service-model">${service.modelId}</div>
            <div class="actions">
                <button class="edit-btn" title="编辑服务">✏️</button>
                <button class="delete-btn" title="删除服务">🗑️</button>
            </div>
        `;
        serviceList.appendChild(li);
    });
}

export function renderMessages() {
    chatMessages.innerHTML = '';
    const currentMessages = state.messages[state.currentTopicId] || [];
    
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

// --- 模态框逻辑 ---

export function renderOrchestratorMessage(message) {
    const orchestratorMessageEl = document.createElement('div');
    orchestratorMessageEl.className = 'orchestrator-message';
    orchestratorMessageEl.textContent = message;
    chatMessages.appendChild(orchestratorMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 新增：控制中止按钮的显示/隐藏
export function showStopButton() {
    const stopBtn = document.querySelector('.stop-btn');
    if (stopBtn) {
        stopBtn.classList.remove('hidden');
    }
}

export function hideStopButton() {
    const stopBtn = document.querySelector('.stop-btn');
    if (stopBtn) {
        stopBtn.classList.add('hidden');
    }
}

// 辅助函数：填充智能体多选框
function populateAgentCheckboxes(selectedAgentIds = []) {
    const container = document.getElementById('group-agents-selector');
    container.innerHTML = '';
    (state.agents || []).forEach(agent => { // 添加防御性检查
        const label = document.createElement('label');
        label.innerHTML = `
            <input type="checkbox" value="${agent.id}" ${selectedAgentIds.includes(agent.id) ? 'checked' : ''}>
            ${agent.name}
        `;
        container.appendChild(label);
    });
}

// 辅助函数：填充群组选择器
function populateGroupSelector(selectedGroupId = null) {
    const selector = document.getElementById('topic-group-selector');
    selector.innerHTML = '';
    (state.groups || []).forEach(group => { // 添加防御性检查
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        if (group.id === selectedGroupId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

// 辅助函数：填充模型服务选择器
function populateServiceSelector(selectedServiceId = null) {
    const selector = document.getElementById('agent-model-service');
    selector.innerHTML = ''; // 清空旧选项
    (state.modelServices || []).forEach(service => { // 添加防御性检查
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} - ${service.modelId}`; // 显示名称和模型ID
        if (service.id === selectedServiceId) {
            option.selected = true;
        }
        selector.appendChild(option);
    });
}

// --- 打开/关闭模态框 ---

export function openGroupModal(group = null) {
    const form = document.getElementById('group-form');
    const title = groupModal.querySelector('h2');
    if (group) {
        title.textContent = '编辑群组';
        form.dataset.editingId = group.id;
        document.getElementById('group-name').value = group.name;
        populateAgentCheckboxes(group.agentIds);
    } else {
        title.textContent = '创建新群组';
        delete form.dataset.editingId;
        form.reset();
        populateAgentCheckboxes();
    }
    groupModal.classList.remove('hidden');
}

export function closeGroupModal() {
    groupModal.classList.add('hidden');
}

export function openTopicModal(topic = null) {
    const form = document.getElementById('topic-form');
    const title = topicModal.querySelector('h2');
    // const topicNameInput = document.getElementById('topic-name'); // 话题名称输入框已移除

    if (topic) {
        title.textContent = '编辑话题';
        form.dataset.editingId = topic.id;
        // topicNameInput.value = topic.name; // 话题名称不再手动编辑
        populateGroupSelector(topic.groupId);
    } else {
        title.textContent = '创建新话题';
        delete form.dataset.editingId;
        form.reset();
        populateGroupSelector(state.currentGroupId); // 默认选中当前群组
    }
    topicModal.classList.remove('hidden');
}

export function closeTopicModal() {
    topicModal.classList.add('hidden');
}

export function openAgentModal(agent = null) {
    const form = document.getElementById('agent-form');
    const title = agentModal.querySelector('h2');
    const agentNameInput = document.getElementById('agent-name');
    const agentDescriptionInput = document.getElementById('agent-description');
    const agentPromptInput = document.getElementById('agent-prompt');
    const agentModelServiceSelect = document.getElementById('agent-model-service');
    const agentContextCountGroup = document.getElementById('agent-context-count-group');
    const agentContextCountInput = document.getElementById('agent-context-count');

    if (agent) {
        title.textContent = (agent.id === -1) ? '编辑发言统筹器' : '编辑智能体';
        form.dataset.editingId = agent.id;
        agentNameInput.value = agent.name;
        agentDescriptionInput.value = agent.description || '';
        agentPromptInput.value = agent.prompt;
        populateServiceSelector(agent.modelServiceId);

        // 获取 form-group 元素
        const agentNameGroup = agentNameInput.closest('.form-group');
        const agentDescriptionGroup = agentDescriptionInput.closest('.form-group');
        const agentPromptGroup = agentPromptInput.closest('.form-group');

        // 如果是发言统筹器
        if (agent.id === -1) {
            agentNameGroup.classList.add('hidden'); // 隐藏名称
            agentDescriptionGroup.classList.add('hidden'); // 隐藏描述
            agentPromptGroup.classList.add('hidden'); // 隐藏提示词
            agentContextCountGroup.classList.add('hidden'); // 隐藏上下文消息段数
            // 只保留模型服务选项，其他字段禁用或隐藏
            agentNameInput.disabled = true;
            agentDescriptionInput.disabled = true;
            agentPromptInput.disabled = true;
            agentContextCountInput.disabled = true;
        } else {
            agentNameGroup.classList.remove('hidden');
            agentDescriptionGroup.classList.remove('hidden');
            agentPromptGroup.classList.remove('hidden');
            agentContextCountGroup.classList.add('hidden'); // 普通智能体隐藏上下文设置
        }

    } else { // 创建新智能体
        title.textContent = '创建新智能体';
        delete form.dataset.editingId;
        form.reset();
        agentNameInput.closest('.form-group').classList.remove('hidden');
        agentDescriptionInput.closest('.form-group').classList.remove('hidden');
        agentPromptInput.closest('.form-group').classList.remove('hidden');
        agentContextCountGroup.classList.add('hidden'); // 新建智能体隐藏上下文设置
        populateServiceSelector(state.modelServices[0]?.id); // 默认选中第一个服务
    }
    agentModal.classList.remove('hidden');
}

export function closeAgentModal() {
    agentModal.classList.add('hidden');
}

export function openServiceModelModal(service = null) {
    const form = document.getElementById('service-form');
    const title = serviceModal.querySelector('h2');
    if (service) {
        title.textContent = '编辑模型服务';
        form.dataset.editingId = service.id;
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-api-url').value = service.apiUrl;
        document.getElementById('service-api-key').value = service.apiKey;
        document.getElementById('service-model-id').value = service.modelId;
        document.getElementById('service-temperature').value = service.temperature;
        document.getElementById('service-top-p').value = service.topP;
        document.getElementById('service-context-count').value = service.contextMessageCount;
    } else {
        title.textContent = '创建新模型服务';
        delete form.dataset.editingId;
        form.reset();
        // 设置默认值
        document.getElementById('service-temperature').value = 0.7;
        document.getElementById('service-top-p').value = 1.0;
        document.getElementById('service-context-count').value = 10;
    }
    serviceModal.classList.remove('hidden');
}

export function closeServiceModelModal() {
    serviceModal.classList.add('hidden');
}