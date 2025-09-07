// 负责管理应用程序的全局状态
import { loadState } from './storage.js';

const initialState = {
    // 模型服务 (能力)
    modelServices: [
        {
            id: 1,
            name: 'OpenAI (Default)',
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            apiKey: '', // 提示用户在此填入
            modelId: 'gpt-3.5-turbo'
        }
    ],
    // 智能体 (身份)
    agents: [
        { 
            id: 1, 
            name: '默认助手', 
            prompt: 'You are a helpful assistant.',
            modelServiceId: 1 // 关联到 ID 为 1 的模型服务
        }
    ],
    // 聊天记录 (key 是 agent.id)
    messages: {
        1: [{ id: 1, author: 'Samm', text: '你好' }]
    },
    currentAgentId: 1,
    currentUser: { name: 'Samm' }
};

export let state = loadState() || initialState;

// --- 状态修改函数 ---

export function resetState() {
    state = initialState;
}

export function setCurrentAgent(agentId) {
    state.currentAgentId = agentId;
}

export function addModelService(serviceData) {
    const newService = { id: Date.now(), ...serviceData };
    state.modelServices.push(newService);
}

export function updateModelService(serviceId, serviceData) {
    const service = state.modelServices.find(s => s.id === serviceId);
    if (service) { Object.assign(service, serviceData); }
}

export function addAgent(agentData) {
    const newAgent = { id: Date.now(), ...agentData };
    state.agents.push(newAgent);
    if (!state.messages[newAgent.id]) {
        state.messages[newAgent.id] = [];
    }
}

export function updateAgent(agentId, agentData) {
    const agent = state.agents.find(a => a.id === agentId);
    if (agent) {
        Object.assign(agent, agentData);
    }
}

export function addMessage(messageData) {
    if (!state.messages[state.currentAgentId]) {
        state.messages[state.currentAgentId] = [];
    }
    const newMessage = { id: Date.now(), ...messageData };
    state.messages[state.currentAgentId].push(newMessage);
    return newMessage;
}