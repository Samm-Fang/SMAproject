import { state } from './state.js';

// --- DOM 元素引用 (将在 initUI 中填充) ---
const dom = {};

/**
 * 初始化UI，获取所有DOM元素引用
 */
export function initUI() {
    // 面板
    dom.panels = {
        topics: document.getElementById('topics-panel'),
        groups: document.getElementById('groups-panel'),
        agents: document.getElementById('agents-panel'),
        services: document.getElementById('services-panel'),
    };
    // 列表容器
    dom.lists = {
        topics: document.querySelector('.topic-list'),
        groups: document.querySelector('.group-list'),
        agents: document.querySelector('.agent-list'),
        services: document.querySelector('.service-list'),
    };
    // 模态框
    dom.modals = {
        topic: document.getElementById('topic-modal'),
        group: document.getElementById('group-modal'),
        agent: document.getElementById('agent-modal'),
        service: document.getElementById('service-modal'),
    };
    // 其他
    dom.chatMessages = document.querySelector('.chat-messages');

    // 初始渲染
    renderAll();
}

/**
 * 渲染所有列表
 */
export function renderAll() {
    renderTopics();
    renderGroups();
    renderAgents();
    renderModelServices();
    renderMessages();
}

/**
 * 显示指定的面板，隐藏其他面板
 * @param {string} panelName - 'topics', 'groups', 'agents', 'services'
 */
export function showPanel(panelName) {
    Object.values(dom.panels).forEach(panel => panel.classList.add('hidden'));
    if (dom.panels[panelName]) {
        dom.panels[panelName].classList.remove('hidden');
    }
}

// --- 列表渲染函数 ---

export function renderTopics() {
    dom.lists.topics.innerHTML = '';
    state.topics.forEach(topic => {
        const li = document.createElement('li');
        li.className = 'list-item topic-item';
        li.dataset.id = topic.id;
        if (topic.id === state.currentTopicId) {
            li.classList.add('active');
        }
        li.innerHTML = `<span>${topic.name}</span><button class="delete-btn" data-id="${topic.id}">×</button>`;
        dom.lists.topics.appendChild(li);
    });
}

export function renderGroups() {
    dom.lists.groups.innerHTML = '';
    state.groups.forEach(group => {
        const li = document.createElement('li');
        li.className = 'list-item group-item';
        li.dataset.id = group.id;
        li.innerHTML = `<span>${group.name}</span><button class="delete-btn" data-id="${group.id}">×</button>`;
        dom.lists.groups.appendChild(li);
    });
}

export function renderAgents() {
    dom.lists.agents.innerHTML = '';
    state.agents.forEach(agent => {
        const li = document.createElement('li');
        li.className = 'list-item agent-item';
        li.dataset.id = agent.id;
        li.innerHTML = `<span>${agent.name}</span><button class="delete-btn" data-id="${agent.id}">×</button>`;
        dom.lists.agents.appendChild(li);
    });
}

export function renderModelServices() {
    dom.lists.services.innerHTML = '';
    state.modelServices.forEach(service => {
        const li = document.createElement('li');
        li.className = 'list-item service-item';
        li.dataset.id = service.id;
        li.innerHTML = `<span>${service.name} (${service.modelId})</span><button class="delete-btn" data-id="${service.id}">×</button>`;
        dom.lists.services.appendChild(li);
    });
}

export function renderMessages() {
    dom.chatMessages.innerHTML = '';
    const currentMessages = state.messages[state.currentTopicId] || [];
    currentMessages.forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        if (message.author === state.currentUser.name) {
            messageEl.classList.add('user-message');
        }
        messageEl.innerHTML = `<div class="author">${message.author}</div><div class="text">${message.text}</div>`;
        dom.chatMessages.appendChild(messageEl);
    });
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

// --- 模态框控制 ---

function openModal(modalName, entity = null) {
    const modal = dom.modals[modalName];
    const form = modal.querySelector('form');
    form.reset();
    delete form.dataset.editingId;

    if (entity) {
        form.dataset.editingId = entity.id;
        form.querySelector('h2').textContent = `编辑${modal.dataset.entityName}`;
        Object.keys(entity).forEach(key => {
            const input = form.elements[key];
            if (input) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    // 需要更复杂的逻辑来处理
                } else {
                    input.value = entity[key];
                }
            }
        });
    } else {
        form.querySelector('h2').textContent = `创建新${modal.dataset.entityName}`;
    }
    
    // 特殊处理
    if (modalName === 'agent') populateServiceSelector(entity ? entity.modelServiceId : null);
    if (modalName === 'group') populateAgentSelector(entity ? entity.agentIds : []);
    if (modalName === 'topic') populateGroupSelector(entity ? entity.groupId : null);

    modal.classList.remove('hidden');
}

function closeModal(modalName) {
    dom.modals[modalName].classList.add('hidden');
}

export const openTopicModal = (entity) => openModal('topic', entity);
export const closeTopicModal = () => closeModal('topic');
export const openGroupModal = (entity) => openModal('group', entity);
export const closeGroupModal = () => closeModal('group');
export const openAgentModal = (entity) => openModal('agent', entity);
export const closeAgentModal = () => closeModal('agent');
export const openServiceModelModal = (entity) => openModal('service', entity);
export const closeServiceModelModal = () => closeModal('service');


// --- 模态框内动态内容 ---

function populateServiceSelector(selectedId) {
    const select = dom.modals.agent.querySelector('select[name="modelServiceId"]');
    select.innerHTML = '';
    state.modelServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = service.name;
        if (service.id === selectedId) option.selected = true;
        select.appendChild(option);
    });
}

function populateGroupSelector(selectedId) {
    const select = dom.modals.topic.querySelector('select[name="groupId"]');
    select.innerHTML = '';
    state.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        if (group.id === selectedId) option.selected = true;
        select.appendChild(option);
    });
}

function populateAgentSelector(selectedIds = []) {
    const container = dom.modals.group.querySelector('.multi-select-container');
    container.innerHTML = '';
    state.agents.forEach(agent => {
        const div = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = agent.id;
        checkbox.id = `agent-select-${agent.id}`;
        if (selectedIds.includes(agent.id)) checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = agent.name;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}