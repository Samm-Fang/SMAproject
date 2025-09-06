// 负责管理应用程序的全局状态
import { loadState } from './storage.js';

const initialState = {
    modelServices: [{ id: 1, name: 'OpenAI (Default)', apiUrl: 'https://api.openai.com/v1/chat/completions', apiKey: '', modelId: 'gpt-3.5-turbo' }],
    agents: [{ id: 1, name: '通用助手', prompt: 'You are a helpful assistant.', modelServiceId: 1 }],
    groups: [{ id: 1, name: '默认群组', agentIds: [1] }],
    topics: [{ id: 1, name: '初始对话', groupId: 1 }],
    messages: { 1: [{ id: 1, author: 'Samm', text: '你好' }] },
    currentTopicId: 1,
    currentUser: { name: 'Samm' }
};

const loadedState = loadState();
export let state = loadedState ? { ...initialState, ...loadedState } : initialState;

// --- 状态修改函数 ---

export function resetState() {
    state = initialState;
}

export function setCurrentTopic(topicId) {
    state.currentTopicId = topicId;
}

// -- Model Service Management --
export function addModelService(serviceData) {
    const newService = { id: Date.now(), ...serviceData };
    state.modelServices.push(newService);
}
export function updateModelService(serviceId, serviceData) {
    const service = state.modelServices.find(s => s.id === serviceId);
    if (service) Object.assign(service, serviceData);
}
export function deleteModelService(serviceId) {
    state.modelServices = state.modelServices.filter(s => s.id !== serviceId);
    // TODO: 处理依赖该服务的智能体
}

// -- Agent Management --
export function addAgent(agentData) {
    const newAgent = { id: Date.now(), ...agentData };
    state.agents.push(newAgent);
}
export function updateAgent(agentId, agentData) {
    const agent = state.agents.find(a => a.id === agentId);
    if (agent) Object.assign(agent, agentData);
}
export function deleteAgent(agentId) {
    state.agents = state.agents.filter(a => a.id !== agentId);
    // TODO: 处理依赖该智能体的群组
}

// -- Group Management --
export function addGroup(groupData) {
    const newGroup = { id: Date.now(), ...groupData };
    state.groups.push(newGroup);
}
export function updateGroup(groupId, groupData) {
    const group = state.groups.find(g => g.id === groupId);
    if (group) Object.assign(group, groupData);
}
export function deleteGroup(groupId) {
    state.groups = state.groups.filter(g => g.id !== groupId);
    // TODO: 处理依赖该群组的话题
}

// -- Topic Management --
export function addTopic(topicData) {
    const newTopic = { id: Date.now(), ...topicData };
    state.topics.push(newTopic);
    if (!state.messages[newTopic.id]) {
        state.messages[newTopic.id] = [];
    }
}
export function deleteTopic(topicId) {
    state.topics = state.topics.filter(t => t.id !== topicId);
    delete state.messages[topicId];
}

// -- Message Management --
export function addMessage(messageData) {
    const topicId = state.currentTopicId;
    if (!state.messages[topicId]) {
        state.messages[topicId] = [];
    }
    const newMessage = { id: Date.now(), ...messageData };
    state.messages[topicId].push(newMessage);
    return newMessage;
}