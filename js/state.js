// 负责管理应用程序的全局状态
import { loadState } from './storage.js';

const initialState = {
    // 模型服务 (能力提供方)
    modelServices: [
        {
            id: 1,
            name: 'OpenAI (Default)',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '', // 用户在此填入
            modelId: 'gpt-3.5-turbo',
            temperature: 0.7,
            topP: 1.0,
            contextMessageCount: 10 // 默认发送最近10条消息作为上下文
        }
    ],
    // 发言统筹器智能体，永远存在且无法删除
    orchestratorAgent: {
        id: -1, // 特殊ID
        name: '发言统筹器',
        prompt: '你是一个专业的群聊发言统筹器，负责在群聊中决定下一个发言的智能体。你需要根据对话内容和每个智能体的特点，合理安排发言顺序。你的目标是让群聊流畅、高效、有深度。',
        modelServiceId: 1, // 默认关联到 ID 为 1 的模型服务
        contextMessageCount: 10 // 发言统筹器使用的上下文消息数量
    },
    // 智能体 (身份定义)
    agents: [
        {
            id: 1,
            name: '默认助手',
            prompt: '你是一个乐于助人的助手。',
            modelServiceId: 1 // 关联到 ID 为 1 的模型服务
        }
    ],
    // 群组 (智能体集合)
    groups: [
        {
            id: 1,
            name: '默认群组',
            agentIds: [1] // 包含默认助手
        }
    ],
    // 话题 (聊天会话)
    topics: [
        {
            id: 1,
            name: '默认话题',
            groupId: 1 // 关联到默认群组
        }
    ],
    // 聊天记录 (key 是 topic.id)
    messages: {
        1: [{ id: 1, author: 'Samm', text: '你好' }]
    },
    // 当前选中状态
    currentGroupId: 1,
    currentTopicId: 1, // 默认选中默认话题
    currentUser: { name: 'Samm' },
    chatMode: 'group', // 'group' 或 'private'
    orchestratorChainActive: false, // 标记发言统筹器链条是否激活
    totalInputTokens: 0, // 累计消耗的输入 tokens
    totalOutputTokens: 0 // 累计消耗的输出 tokens
};

// 确保加载的状态完整性
let loadedState = loadState();
if (loadedState) {
    // 检查并初始化可能缺失的数组
    loadedState.modelServices = loadedState.modelServices || [];
    loadedState.agents = loadedState.agents || [];
    loadedState.groups = loadedState.groups || [];
    loadedState.topics = loadedState.topics || [];
    loadedState.messages = loadedState.messages || {};
    // 确保 currentGroupId 和 currentTopicId 存在，或回退到默认
    loadedState.currentGroupId = loadedState.currentGroupId || initialState.currentGroupId;
    loadedState.currentTopicId = loadedState.currentTopicId || initialState.currentTopicId;
    // 确保发言统筹器存在，如果不存在则使用初始状态的发言统筹器
    loadedState.orchestratorAgent = loadedState.orchestratorAgent || initialState.orchestratorAgent;
    // 确保 chatMode 和 orchestratorChainActive 存在
    loadedState.chatMode = loadedState.chatMode || initialState.chatMode;
    loadedState.orchestratorChainActive = loadedState.orchestratorChainActive || initialState.orchestratorChainActive;
    loadedState.totalInputTokens = loadedState.totalInputTokens || initialState.totalInputTokens; // 确保 totalInputTokens 存在
    loadedState.totalOutputTokens = loadedState.totalOutputTokens || initialState.totalOutputTokens; // 确保 totalOutputTokens 存在
}
export let state = loadedState || initialState;

// 新增：重置 tokens 的函数
export function resetTokens() {
    state.totalInputTokens = 0;
    state.totalOutputTokens = 0;
}

// 新增：更新 tokens 的函数
export function addInputTokens(count) {
    state.totalInputTokens += count;
}

export function addOutputTokens(count) {
    state.totalOutputTokens += count;
}

// --- 状态修改函数 ---

export function resetState() {
    state = JSON.parse(JSON.stringify(initialState)); // 深拷贝 initialState，避免引用问题
}

// --- 发言统筹器相关函数 ---
export function updateOrchestratorAgent(agentData) {
    Object.assign(state.orchestratorAgent, agentData);
}

// --- ModelServices CRUD ---
export function addModelService(serviceData) {
    const newService = { id: Date.now(), ...serviceData };
    state.modelServices.push(newService);
}

export function updateModelService(serviceId, serviceData) {
    const service = state.modelServices.find(s => s.id === serviceId);
    if (service) { Object.assign(service, serviceData); }
}

export function deleteModelService(serviceId) {
    state.modelServices = state.modelServices.filter(s => s.id !== serviceId);
    // TODO: 检查是否有智能体关联到此服务，并处理
}

// --- Agents CRUD ---
export function addAgent(agentData) {
    const newAgent = { id: Date.now(), ...agentData };
    state.agents.push(newAgent);
}

export function updateAgent(agentId, agentData) {
    const agent = state.agents.find(a => a.id === agentId);
    if (agent) { Object.assign(agent, agentData); }
}

export function deleteAgent(agentId) {
    state.agents = state.agents.filter(a => a.id !== agentId);
    // 从所有群组中移除被删除的智能体
    state.groups.forEach(group => {
        group.agentIds = group.agentIds.filter(id => id !== agentId);
    });
    // TODO: 如果群组的 agentIds 变为空，是否删除该群组？目前不删除。
}

// --- Groups CRUD ---
export function addGroup(groupData) {
    // 确保 groups 数组存在
    if (!state.groups) { state.groups = []; }
    const newGroup = { id: Date.now(), ...groupData };
    state.groups.push(newGroup);
}

export function updateGroup(groupId, groupData) {
    const group = state.groups.find(g => g.id === groupId);
    if (group) { Object.assign(group, groupData); }
}

export function deleteGroup(groupId) {
    state.groups = state.groups.filter(g => g.id !== groupId);
    // TODO: 检查是否有话题关联到此群组，并处理
}

// --- Topics CRUD ---
export function addTopic(topicData) {
    // 确保 topics 数组存在
    if (!state.topics) { state.topics = []; }
    const newTopic = { id: Date.now(), name: topicData.name || '新话题', ...topicData }; // 如果没有提供名称，则默认为“新话题”
    state.topics.push(newTopic);
    // 为新话题创建空的聊天记录
    if (!state.messages[newTopic.id]) {
        state.messages[newTopic.id] = [];
    }
    return newTopic; // 返回新创建的话题对象
}

export function updateTopic(topicId, topicData) {
    const topic = state.topics.find(t => t.id === topicId);
    if (topic) { Object.assign(topic, topicData); }
}

export function updateTopicName(topicId, newName) {
    const topic = state.topics.find(t => t.id === topicId);
    if (topic) {
        topic.name = newName;
    }
}

export function deleteTopic(topicId) {
    state.topics = state.topics.filter(t => t.id !== topicId);
    delete state.messages[topicId]; // 删除相关聊天记录
}

// --- Current Selection ---
export function setCurrentGroup(groupId) {
    state.currentGroupId = groupId;
    // 当群组改变时，默认选中该群组的第一个话题
    const topicsInGroup = state.topics.filter(t => t.groupId === groupId);
    if (topicsInGroup.length > 0) {
        state.currentTopicId = topicsInGroup[0].id;
    } else {
        state.currentTopicId = null;
    }
}

export function setCurrentTopic(topicId) {
    state.currentTopicId = topicId;
    // 确保 currentGroupId 与当前话题所属群组一致
    const topic = state.topics.find(t => t.id === topicId);
    if (topic && topic.groupId !== state.currentGroupId) {
        state.currentGroupId = topic.groupId;
    }
}

// --- Message Management ---
export function addMessage(messageData) {
    if (!state.messages[state.currentTopicId]) {
        state.messages[state.currentTopicId] = [];
    }
    const newMessage = { id: Date.now(), ...messageData };
    state.messages[state.currentTopicId].push(newMessage);
    return newMessage;
}