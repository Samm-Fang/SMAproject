// AI 智能体群聊应用的主脚本文件
import { state, addModelService, updateModelService, deleteModelService, addAgent, updateAgent, deleteAgent, addGroup, updateGroup, deleteGroup, addTopic, updateTopic, deleteTopic, setCurrentGroup, setCurrentTopic, addMessage, updateTopicName } from './state.js';
import { saveState } from './storage.js';
import { getAiResponse } from './api.js';
import { initUI, showGroupsPanel, showAgentsPanel, showModelServicesPanel, renderGroups, renderTopics, renderAgents, renderModelServices, renderMessages, openGroupModal, closeGroupModal, openTopicModal, closeTopicModal, openAgentModal, closeAgentModal, openServiceModelModal, closeServiceModelModal, updateChatAreaVisibility } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    initUI();
    
    // --- 视图切换事件 ---
    document.querySelector('.sidebar-icon[title="群组"]').addEventListener('click', () => {
        showGroupsPanel();
        renderGroups();
    });
    // 侧边栏不再有独立的话题入口，其事件监听器已移除
    document.querySelector('.sidebar-icon[title="智能体"]').addEventListener('click', () => {
        showAgentsPanel();
        renderAgents();
    });
    document.querySelector('.sidebar-icon[title="设置"]').addEventListener('click', () => {
        showModelServicesPanel();
        renderModelServices();
    });

    // --- 群组管理事件 ---
    document.getElementById('add-group-btn').addEventListener('click', () => openGroupModal());
    document.querySelector('.group-list').addEventListener('click', (e) => {
        const groupItem = e.target.closest('.group-item');
        if (!groupItem) return;

        const groupId = Number(groupItem.dataset.id);
        
        if (e.target.matches('.edit-btn')) {
            const group = state.groups.find(g => g.id === groupId);
            openGroupModal(group);
        } else if (e.target.matches('.delete-btn')) {
            if (confirm('确定要删除此群组吗？这将同时删除该群组下所有的话题和聊天记录。')) {
                deleteGroup(groupId);
                saveState(state);
                renderGroups();
                // 确保当前选中的群组和话题仍然有效
                if (state.currentGroupId === groupId) {
                    state.currentGroupId = state.groups[0]?.id || null;
                    state.currentTopicId = null;
                }
                renderTopics();
                renderMessages();
            }
        } else {
            // 切换群组
            setCurrentGroup(groupId);
            renderGroups(); // 刷新群组列表的active状态
            renderTopics(); // 刷新话题列表
            renderMessages(); // 刷新聊天记录
            saveState(state);
            updateChatAreaVisibility();
        }
    });

    document.getElementById('group-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('group-name').value;
        const selectedAgentIds = Array.from(document.querySelectorAll('#group-agents-selector input[type="checkbox"]:checked'))
                                    .map(checkbox => Number(checkbox.value));
        const groupData = { name, agentIds: selectedAgentIds };

        const editingId = Number(e.target.dataset.editingId);
        if (editingId) {
            updateGroup(editingId, groupData);
        } else {
            addGroup(groupData);
        }
        saveState(state);
        renderGroups();
        closeGroupModal();
        e.target.reset();
    });
    document.querySelector('#group-modal .btn-cancel').addEventListener('click', closeGroupModal);

    // --- 话题管理事件 ---
    // 话题现在嵌套在群组面板内，不再有独立的侧边栏入口
    document.getElementById('add-topic-btn').addEventListener('click', () => openTopicModal());
    document.querySelector('.topic-list').addEventListener('click', (e) => {
        const topicItem = e.target.closest('.topic-item');
        if (!topicItem) return;

        const topicId = Number(topicItem.dataset.id);
        
        if (e.target.matches('.edit-btn')) {
            const topic = state.topics.find(t => t.id === topicId);
            openTopicModal(topic);
        } else if (e.target.matches('.delete-btn')) {
            if (confirm('确定要删除此话题吗？这将同时删除所有聊天记录。')) {
                deleteTopic(topicId);
                saveState(state);
                renderTopics();
                // 确保当前选中的话题仍然有效
                if (state.currentTopicId === topicId) {
                    state.currentTopicId = state.topics.find(t => t.groupId === state.currentGroupId)?.id || null;
                }
                renderMessages();
            }
        } else {
            // 切换话题
            setCurrentTopic(topicId);
            renderTopics(); // 刷新话题列表的active状态
            renderMessages(); // 刷新聊天记录
            saveState(state);
            updateChatAreaVisibility();
        }
    });

    document.getElementById('topic-form').addEventListener('submit', (e) => {
        e.preventDefault();
        // const name = document.getElementById('topic-name').value; // 话题名称不再手动输入
        const groupId = Number(document.getElementById('topic-group-selector').value);
        const topicData = { name: '', groupId }; // 初始名称为空字符串

        const editingId = Number(e.target.dataset.editingId);
        if (editingId) {
            updateTopic(editingId, topicData);
        } else {
            addTopic(topicData);
        }
        saveState(state);
        renderTopics();
        closeTopicModal();
        e.target.reset();
    });
    document.querySelector('#topic-modal .btn-cancel').addEventListener('click', closeTopicModal);

    // --- 智能体管理事件 ---
    document.getElementById('add-agent-btn').addEventListener('click', () => openAgentModal());
    document.querySelector('.agent-list').addEventListener('click', (e) => {
        const agentItem = e.target.closest('.agent-item');
        if (!agentItem) return;

        const agentId = Number(agentItem.dataset.id);
        
        if (e.target.matches('.edit-btn')) {
            const agent = state.agents.find(a => a.id === agentId);
            openAgentModal(agent);
        } else if (e.target.matches('.delete-btn')) {
            if (confirm('确定要删除此智能体吗？')) {
                deleteAgent(agentId);
                saveState(state);
                renderAgents();
                // TODO: 检查是否有群组或话题关联到此智能体，并处理
            }
        } else {
            // 切换智能体 (主要用于查看其配置，不直接切换聊天对象)
            // setCurrentAgent(agentId); // 仅更新当前选中的智能体ID，不影响聊天
            // renderAgents();
            // saveState(state);
        }
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
        saveState(state);
        renderAgents();
        closeAgentModal();
        e.target.reset();
    });
    document.querySelector('#agent-modal .btn-cancel').addEventListener('click', closeAgentModal);

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

    document.getElementById('service-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const serviceData = {
            name: document.getElementById('service-name').value,
            apiUrl: document.getElementById('service-api-url').value,
            apiKey: document.getElementById('service-api-key').value,
            modelId: document.getElementById('service-model-id').value,
            temperature: Number(document.getElementById('service-temperature').value),
            topP: Number(document.getElementById('service-top-p').value),
            contextMessageCount: Number(document.getElementById('service-context-count').value),
        };
        
        const editingId = Number(e.target.dataset.editingId);
        if (editingId) {
            updateModelService(editingId, serviceData);
        } else {
            addModelService(serviceData);
        }
        saveState(state);
        renderModelServices();
        closeServiceModelModal();
        e.target.reset();
    });
    document.querySelector('#service-modal .btn-cancel').addEventListener('click', closeServiceModelModal);

    // --- 发送消息事件 ---
    const sendBtn = document.querySelector('.send-btn');
    const messageInput = document.querySelector('.chat-input-area textarea');

    async function handleSendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // 检查是否是新话题的第一条消息，如果是则自动命名
        if (state.currentTopicId && state.messages[state.currentTopicId]?.length === 0) {
            updateTopicName(state.currentTopicId, text.substring(0, 20) + '...'); // 使用前20个字符作为名称
            renderTopics(); // 更新话题列表显示
        }

        // 1. 立即更新UI
        addMessage({ author: state.currentUser.name, text });
        renderMessages();
        messageInput.value = '';
        messageInput.focus();
        
        // --- 禁用输入 ---
        sendBtn.disabled = true;
        messageInput.disabled = true;

        // 2. 准备 API 调用
        if (!state.currentTopicId) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert('请先选择一个话题开始聊天！');
        }
        const currentTopic = state.topics.find(t => t.id === state.currentTopicId);
        if (!currentTopic) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert('错误：找不到当前话题！');
        }

        const currentGroup = state.groups.find(g => g.id === currentTopic.groupId);
        if (!currentGroup || currentGroup.agentIds.length === 0) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert('错误：当前话题所属群组不存在或群组中没有智能体！');
        }

        // 简化版：只与群组中的第一个智能体对话
        const targetAgentId = currentGroup.agentIds[0];
        const targetAgent = state.agents.find(a => a.id === targetAgentId);
        if (!targetAgent) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert('错误：找不到目标智能体！');
        }

        const modelService = state.modelServices.find(s => s.id === targetAgent.modelServiceId);
        if (!modelService) {
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return alert(`错误：找不到ID为 ${targetAgent.modelServiceId} 的模型服务！`);
        }
        
        const apiConfig = {
            url: modelService.apiUrl,
            apiKey: modelService.apiKey,
            modelId: modelService.modelId,
            temperature: modelService.temperature,
            topP: modelService.topP,
            contextMessageCount: modelService.contextMessageCount
        };

        if (!apiConfig.apiKey) {
            alert(`请先在 "模型服务" 中为服务 "${modelService.name}" 配置API Key！`);
            showModelServicesPanel(); // 切换到模型服务面板
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }

        const history = state.messages[state.currentTopicId] || [];
        // 根据 contextMessageCount 截断历史消息
        const messagesToSend = history.slice(Math.max(0, history.length - apiConfig.contextMessageCount));

        // 3. 调用 API 并处理流式响应
        let aiMessage = null; 

        await getAiResponse(
            apiConfig,
            targetAgent.prompt,
            messagesToSend, // 使用截断后的历史消息
            (delta) => { // onStream
                if (delta.content) {
                    if (aiMessage === null) {
                        aiMessage = addMessage({ author: targetAgent.name, text: delta.content });
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