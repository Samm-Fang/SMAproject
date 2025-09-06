// AI 智能体群聊应用的主脚本文件
import { initUI, showAgentsPanel, showSettingsPanel, openAgentModal, closeAgentModal, renderAgents, renderMessages } from './ui.js';
import { state, addAgent, setCurrentAgent, addMessage } from './state.js';
import { saveState } from './storage.js';
import { getAiResponse } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    initUI();
    
    // --- 视图切换事件 ---
    document.querySelector('.sidebar-icon[title="智能体"]').addEventListener('click', showAgentsPanel);
    document.querySelector('.sidebar-icon[title="设置"]').addEventListener('click', showSettingsPanel);

    // --- 智能体切换事件 ---
    document.querySelector('.agent-list').addEventListener('click', (e) => {
        const agentItem = e.target.closest('.agent-item');
        if (agentItem) {
            const agentId = Number(agentItem.dataset.id);
            setCurrentAgent(agentId);
            renderAgents();
            renderMessages();
            saveState(state);
        }
    });

    // --- 设置保存事件 ---
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        state.settings.defaultApiUrl = document.getElementById('default-api-url').value;
        state.settings.defaultApiKey = document.getElementById('default-api-key').value;
        state.settings.defaultModelId = document.getElementById('default-model-id').value;
        saveState(state);
        alert('设置已保存！');
        showAgentsPanel(); // 保存后切回智能体列表
    });

    // --- 智能体模态框事件 ---
    document.getElementById('add-agent-btn').addEventListener('click', openAgentModal);
    document.querySelector('#agent-modal .btn-cancel').addEventListener('click', closeAgentModal);
    
    document.getElementById('agent-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('agent-name').value;
        const description = document.getElementById('agent-description').value;
        const prompt = document.getElementById('agent-prompt').value;
        const apiUrl = document.getElementById('agent-api-url').value;
        const apiKey = document.getElementById('agent-api-key').value;
        const modelId = document.getElementById('agent-model-id').value;
        
        addAgent({ name, description, prompt, apiUrl, apiKey, modelId });
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
            alert('错误：找不到当前智能体！');
            return;
        }

        const apiConfig = {
            url: currentAgent.apiUrl || state.settings.defaultApiUrl,
            apiKey: currentAgent.apiKey || state.settings.defaultApiKey,
            modelId: currentAgent.modelId || state.settings.defaultModelId
        };

        if (!apiConfig.apiKey) {
            alert('请先在设置中配置API Key！');
            showSettingsPanel();
            return;
        }

        const history = state.messages[state.currentAgentId] || [];

        // 3. 调用 API 并处理流式响应
        let aiMessage = { author: currentAgent.name, text: '' };
        let isFirstChunk = true;

        await getAiResponse(
            apiConfig,
            currentAgent.prompt,
            history,
            (delta) => { // onStream
                if (delta.content) {
                    if (isFirstChunk) {
                        addMessage(aiMessage);
                        isFirstChunk = false;
                    }
                    aiMessage.text += delta.content;
                    renderMessages();
                }
            },
            () => { // onComplete
                saveState(state);
                console.log('Stream complete.');
            },
            (error) => { // onError
                aiMessage.text += `\n\n**错误:** ${error.message}`;
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