// 负责管理应用程序的全局状态

export const state = {
    agents: [
        { id: 1, name: 'AI 协调员', description: '负责分配和管理发言时机' },
        { id: 2, name: '产品经理', description: '关注用户需求和产品方向' },
        { id: 3, name: '技术专家', description: '提供技术见解和解决方案' }
    ],
    topics: [],
    currentThread: null,
    currentUser: {
        name: 'Samm'
    }
};

// 可以在这里添加用于修改状态的函数，以确保状态变更的可预测性
// export function addAgent(agent) { ... }
// export function setCurrentThread(threadId) { ... }