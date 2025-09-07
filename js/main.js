// AI 智能体群聊应用的主脚本文件
import { state, addAgent, updateAgent, setCurrentAgent, addMessage, addModelService, updateModelService } from './state.js';
import { saveState } from './storage.js';
import { getAiResponse } from './api.js';
import { initUI, showAgentsPanel, showSettingsPanel, openAgentModal, closeAgentModal, renderAgents, renderMessages, openServiceModelModal, closeServiceModelModal, renderModelServices } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    initUI();
    
    // --- 视图切换事件 ---
    document.querySelector('.sidebar-icon[title="智能体"]').addEventListener('click', showAgentsPanel);
    document.querySelector('.sidebar-icon[title="设置"]').addEventListener('click', showSettingsPanel);

    // --- 智能体列表事件 (切换与编辑) ---
    document.querySelector('.agent-list').addEventListener('click', (e) => {
        const agentItem = e.target.closest('.agent-item');
        if (!agentItem) return;

        const agentId = Number(agentItem.dataset.id);
        
        if (e.target.matches('.edit-btn')) {
            // 编辑模式
            const agent = state.agents.find(a => a.id === agentId);
            openAgentModal(agent);
        } else {
            // 切换模式
            setCurrentAgent(agentId);
            renderAgents();
            renderMessages();
            saveState(state);
        }
    });

    // --- 模型服务管理事件 ---
    document.getElementById('add-service-btn').addEventListener('click', () => openServiceModelModal());
    document.querySelector('.service-list').addEventListener('click', (e) => {
        const serviceItem = e.target.closest('.service-item');
        if (serviceItem) {
            const serviceId = Number(serviceItem.dataset.id);
            const service = state.modelServices.find(s => s.id === serviceId);
            openServiceModelModal(service);
        }
    });

    // --- 智能体模态框事件 ---
    document.getElementById('add-agent-btn').addEventListener('click', openAgentModal);
    document.querySelector('#agent-modal .btn-cancel').addEventListener('click', closeAgentModal);
    
    // --- 服务模态框事件 ---
    document.querySelector('#service-modal .btn-cancel').addEventListener('click', closeServiceModelModal);
    document.getElementById('service-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceData = {
            name: document.getElementById('service-name').value,
            apiUrl: document.getElementById('service-api-url').value,
            apiKey: document.getElementById('service-api-key').value,
            modelId: document.getElementById('service-model-id').value,
        };
        
        const editingId = Number(e.target.dataset.editingId);
        if (editingId) {
            updateModelService(editingId, serviceData);
        } else {
            addModelService(serviceData);
        }
        
        renderModelServices();
        saveState(state);
        closeServiceModelModal();
    });

    document.getElementById('agent-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const agentData = {
            name: document.getElementById('agent-name').value,
            description: document.getElementById('agent-description').value,
            prompt: document.getElementById('agent-prompt').value,
            modelServiceId: Number(document.getElementById('agent-model-service').value)
        };

        const editingId = Number(e.target.dataset.editingId);
        if (editingId) {
            updateAgent(editingId, agentData);
        } else {
            addAgent(agentData);
        }
        
        renderAgents();
        saveState(state);
        closeAgentModal();
        e.target.reset();
    });

    // --- 发送消息事件 ---
    const sendBtn = document.querySelector('.send-btn');
    const messageInput = document.querySelector('.chat-input-area textarea');

    async function handleSendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // 1. 立即更新UI
        addMessage({ author: state.currentUser.name, text });
        renderMessages();
        messageInput.value = '';
        messageInput.focus();
        
        // --- 禁用输入 ---
        sendBtn.disabled = true;
        messageInput.disabled = true;

        // 2. 准备 API 调用
        const currentAgent = state.agents.find(a => a.id === state.currentAgentId);
        if (!currentAgent) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert('错误：找不到当前智能体！');
        }

        const modelService = state.modelServices.find(s => s.id === currentAgent.modelServiceId);
        if (!modelService) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert(`错误：找不到ID为 ${currentAgent.modelServiceId} 的模型服务！`);
        }
        
        const apiConfig = {
            url: modelService.apiUrl,
            apiKey: modelService.apiKey,
            modelId: modelService.modelId
        };

        if (!apiConfig.apiKey) {
            alert(`请先在 "设置" 中为模型服务 "${modelService.name}" 配置API Key！`);
            showSettingsPanel();
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }

        const history = state.messages[state.currentAgentId] || [];

        // 3. 调用 API 并处理流式响应
        let aiMessage = null; 

        await getAiResponse(
            apiConfig,
            currentAgent.prompt,
            history,
            (delta) => { // onStream
                if (delta.content) {
                    if (aiMessage === null) {
                        aiMessage = addMessage({ author: currentAgent.name, text: delta.content });
                    } else {
                        aiMessage.text += delta.content;
                    }
                    renderMessages();
                }
            },
            () => { // onComplete
                saveState(state);
                console.log('Stream complete.');
            },
            (error) => { // onError
                if (aiMessage) {
                    aiMessage.text += `\n\n**错误:** ${error.message}`;
                } else {
                    addMessage({ author: 'Error', text: error.message });
                }
                renderMessages();
                saveState(state);
            }
        ).finally(() => {
            // --- 恢复输入 ---
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        });
    }

    sendBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
});