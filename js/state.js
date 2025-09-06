// 负责管理应用程序的全局状态
import { loadState } from './storage.js';

const initialState = {
    settings: {
        defaultApiUrl: 'https://api.openai.com/v1/chat/completions',
        defaultApiKey: '',
        defaultModelId: 'gpt-3.5-turbo'
    },
    agents: [
        {
            id: 1,
            name: '默认助手',
            description: '一个通用的AI助手',
            prompt: 'You are a helpful assistant.',
            apiUrl: '', // 为空则使用默认值
            apiKey: '', // 为空则使用默认值
            modelId: '' // 为空则使用默认值
        }
    ],
    // messages 的 key 现在是 agent.id
    messages: {
        1: [{ author: 'Samm', text: '你好' }]
    },
    // currentThreadId 替换为 currentAgentId
    currentAgentId: 1,
    currentUser: { name: 'Samm' }
};

export let state = loadState() || initialState;

// 因为 state 不再是 const，我们可以提供一个重置函数
export function resetState() {
    state = initialState;
}

export function setCurrentAgent(agentId) {
    state.currentAgentId = agentId;
}

// ... 其他修改状态的函数

/**
 * 向状态中添加一个新的智能体
 * @param {object} agentData - { name, description, prompt }
 */
export function addAgent(agentData) {
    const newAgent = {
        id: Date.now(), // 使用时间戳作为临时唯一ID
        ...agentData
    };
    state.agents.push(newAgent);
}

/**
 * 设置当前选中的话题
 * @param {number} topicId
 */
export function setCurrentThread(topicId) {
    state.currentThreadId = topicId;
}

/**
 * 添加一个新话题
 * @param {string} topicName
 */
export function addTopic(topicName) {
    const newTopic = {
        id: Date.now(),
        name: topicName,
        unread: 0
    };
    state.topics.push(newTopic);
    // 同时为新话题创建空的聊天记录
    state.messages[newTopic.id] = [];
}

/**
 * 向当前话题添加一条新消息
 * @param {object} messageData - { author, text }
 */
export function addMessage(messageData) {
    if (state.messages[state.currentThreadId]) {
        state.messages[state.currentThreadId].push(messageData);
    }
}