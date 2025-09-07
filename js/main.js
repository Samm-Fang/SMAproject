// AI 智能体群聊应用的主脚本文件
import { state, addModelService, updateModelService, deleteModelService, addAgent, updateAgent, deleteAgent, addGroup, updateGroup, deleteGroup, addTopic, updateTopic, deleteTopic, setCurrentGroup, setCurrentTopic, addMessage, updateTopicName, updateOrchestratorAgent } from './state.js';
import { saveState } from './storage.js';
import { getAiResponse } from './api.js';
import { initUI, showGroupsPanel, showAgentsPanel, showModelServicesPanel, renderGroups, renderTopics, renderAgents, renderModelServices, renderMessages, openGroupModal, closeGroupModal, openTopicModal, closeTopicModal, openAgentModal, closeAgentModal, openServiceModelModal, closeServiceModelModal, updateChatAreaVisibility, renderOrchestratorMessage, showStopButton, hideStopButton } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    initUI();

    // DOM 元素引用 (确保在 DOMContentLoaded 后获取)
    const sendBtn = document.querySelector('.send-btn');
    const messageInput = document.querySelector('.chat-input-area textarea');
    const stopBtn = document.querySelector('.stop-btn');


    /**
     * 处理智能体的回复逻辑
     * @param {Object} agent - 将要发言的智能体对象
     * @param {Array<Object>} messagesToSend - 发送给智能体的消息历史
     * @param {AbortSignal} [signal] - 用于中断请求的 AbortSignal
     * @returns {Promise<string>} 智能体的完整回复文本
     */
    async function processAgentResponse(agent, messagesToSend, signal) {
        const modelService = state.modelServices.find(s => s.id === agent.modelServiceId);
        if (!modelService) {
            throw new Error(`错误：找不到ID为 ${agent.modelServiceId} 的模型服务！`);
        }

        if (!modelService.apiKey) {
            alert(`请先在 "模型服务" 中为服务 "${modelService.name}" 配置API Key！`);
            showModelServicesPanel();
            throw new Error('API Key 未配置。');
        }
        
        const apiConfig = {
            url: modelService.apiUrl,
            apiKey: modelService.apiKey,
            modelId: modelService.modelId,
            temperature: modelService.temperature,
            topP: modelService.topP,
            contextMessageCount: modelService.contextMessageCount
        };

        let aiMessage = null;
        let fullResponse = '';

        await getAiResponse(
            apiConfig,
            agent.prompt,
            messagesToSend,
            (delta) => {
                if (delta.content) {
                    if (aiMessage === null) {
                        aiMessage = addMessage({ author: agent.name, text: delta.content });
                    } else {
                        aiMessage.text += delta.content;
                    }
                    fullResponse += delta.content;
                    renderMessages();
                }
            },
            () => {
                saveState(state);
                console.log(`${agent.name} Stream complete.`);
            },
            (error) => {
                if (aiMessage) {
                    aiMessage.text += `\n\n**错误:** ${error.message}`;
                } else {
                    addMessage({ author: 'Error', text: error.message });
                }
                renderMessages();
                saveState(state);
                throw error; // 重新抛出错误以便上层捕获
            },
            signal // 传递 signal
        );
        return fullResponse;
    }

    /**
     * 生成发言统筹器的提示词。
     * 提示词将包含：
     * 1. 发言统筹器本身的设定。
     * 2. 当前群组中所有智能体的名称和系统提示词。
     * 3. 最近的聊天上下文（根据发言统筹器的上下文数量设置）。
     * @param {Array<Object>} messages - 当前话题的聊天记录。
     * @param {Array<Object>} agentsInGroup - 当前群组中的所有智能体。
     * @returns {string} 组合后的提示词。
     */
    function generateOrchestratorPrompt(messages, agentsInGroup) {
        let prompt = `###你是统筹发言的专家，负责精确的确定一个群组中下一个发言的角色，确保自然和符合语境。
###**以下是群组中所有的成员**
${agentsInGroup.map(agent => agent.name).join(', ')}

###**以下是群组中成员（智能体）的提示词**
${agentsInGroup.map(agent => `<${agent.name}>${agent.prompt}</${agent.name}>`).join('\n')}

`;

        // 添加最近的聊天上下文
        const contextCount = state.orchestratorAgent.contextMessageCount;
        const recentMessages = messages.slice(Math.max(0, messages.length - contextCount));

        if (recentMessages.length > 0) {
            prompt += `
###**以下是最近发生的对话**
`;
            recentMessages.forEach(msg => {
                prompt += `${msg.author}: ${msg.text}\n`;
            });
        }

        prompt += `
现在由你决定下一个发言的成员是谁,你**只需输出**需要发言的成员的名字,切勿输出其他成员的名字和其他内容`;
        return prompt;
    }

    /**
     * 启动群聊工作流
     * @param {Object} currentTopic - 当前话题
     * @param {Object} currentGroup - 当前群组
     * @param {AbortSignal} [signal] - 用于中断请求的 AbortSignal
     */
    async function startGroupChatFlow(currentTopic, currentGroup, signal) {
        state.orchestratorChainActive = true; // 激活链条
        showStopButton(); // 显示中止按钮

        try {
            let continueChat = true;
            while (continueChat && state.orchestratorChainActive) {
                // 1. 获取群组中的智能体
                const agentsInGroup = currentGroup.agentIds.map(agentId => state.agents.find(a => a.id === agentId)).filter(Boolean);
                if (agentsInGroup.length === 0) {
                    renderOrchestratorMessage('错误：当前群组中没有智能体，群聊工作流中断。');
                    break;
                }

                // 2. 准备发言统筹器的API配置和提示词
                const orchestratorService = state.modelServices.find(s => s.id === state.orchestratorAgent.modelServiceId);
                if (!orchestratorService) {
                    renderOrchestratorMessage('错误：找不到发言统筹器的模型服务，群聊工作流中断。');
                    break;
                }

                if (!orchestratorService.apiKey) {
                    alert(`请先在 "模型服务" 中为发言统筹器使用的服务 "${orchestratorService.name}" 配置API Key！`);
                    showModelServicesPanel();
                    break;
                }

                const orchestratorApiConfig = {
                    url: orchestratorService.apiUrl,
                    apiKey: orchestratorService.apiKey,
                    modelId: orchestratorService.modelId,
                    temperature: orchestratorService.temperature,
                    topP: orchestratorService.topP,
                    contextMessageCount: state.orchestratorAgent.contextMessageCount
                };

                const history = state.messages[state.currentTopicId] || [];
                const orchestratorPrompt = generateOrchestratorPrompt(history, agentsInGroup);

                console.log('发言统筹器提示词:', orchestratorPrompt);

                // 3. 调用发言统筹器决定下一个发言者
                let orchestratorResponse = '';
                try {
                    await getAiResponse(
                        orchestratorApiConfig,
                        orchestratorPrompt,
                        [],
                        (delta) => {
                            if (delta.content) {
                                orchestratorResponse += delta.content;
                                renderOrchestratorMessage(`发言统筹器: ${orchestratorResponse}`); // 实时显示
                            }
                        },
                        () => {
                            console.log('发言统筹器完成决策。');
                        },
                        (error) => {
                            renderOrchestratorMessage(`发言统筹器错误: ${error.message}`);
                            console.error('发言统筹器错误:', error);
                            orchestratorResponse = '无';
                        },
                        signal // 传递 signal
                    );
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.log('发言统筹器请求已中止。');
                        renderOrchestratorMessage('发言统筹器请求已中止。');
                    } else {
                        renderOrchestratorMessage(`发言统筹器调用失败: ${error.message}`);
                        console.error('发言统筹器调用失败:', error);
                    }
                    orchestratorResponse = '无'; // 发生错误或中止时，默认无人发言
                }

                // 4. 根据发言统筹器的决定，路由消息给对应的智能体
                const chosenAgentName = orchestratorResponse.trim();
                const chosenAgent = agentsInGroup.find(a => a.name === chosenAgentName);

                if (chosenAgent && chosenAgent.id !== -1) { // 确保不是发言统筹器自己
                    renderOrchestratorMessage(`发言统筹器决定由 ${chosenAgent.name} 发言。`);
                    try {
                        const agentHistory = state.messages[state.currentTopicId] || [];
                        const agentMessagesToSend = agentHistory.slice(Math.max(0, agentHistory.length - chosenAgent.contextMessageCount)); // 使用智能体自己的上下文数量
                        await processAgentResponse(chosenAgent, agentMessagesToSend, signal); // 传递 signal
                    } catch (agentError) {
                        if (agentError.name === 'AbortError') {
                            console.log(`${chosenAgent.name} 的发言请求已中止。`);
                            renderOrchestratorMessage(`${chosenAgent.name} 的发言请求已中止。`);
                        } else {
                            renderOrchestratorMessage(`${chosenAgent.name} 发言失败: ${agentError.message}`);
                            console.error(`${chosenAgent.name} 发言失败:`, agentError);
                        }
                        continueChat = false; // 智能体发言失败或中止，中断链条
                    }
                } else {
                    renderOrchestratorMessage('发言统筹器决定无人发言，链条终止。');
                    continueChat = false; // 无人发言，中断链条
                }
            }
        } catch (flowError) {
            console.error('群聊工作流中断:', flowError);
            renderOrchestratorMessage(`群聊工作流中断: ${flowError.message}`);
        } finally {
            state.orchestratorChainActive = false; // 链条结束
            saveState(state);
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
            hideStopButton(); // 隐藏中止按钮
        }
    }
    
    // --- 视图切换事件 ---
    // 私聊模式切换
    document.querySelector('.sidebar-icon[title="私聊"]').addEventListener('click', (e) => {
        state.chatMode = 'private';
        document.querySelector('.sidebar-icon[title="私聊"]').classList.add('active');
        document.querySelector('.sidebar-icon[title="群聊"]').classList.remove('active');
        showGroupsPanel(); // 私聊也显示群组面板，但只显示当前用户和单个智能体的聊天
        renderGroups();
        saveState(state);
    });

    // 群聊模式切换
    document.querySelector('.sidebar-icon[title="群聊"]').addEventListener('click', (e) => {
        state.chatMode = 'group';
        document.querySelector('.sidebar-icon[title="群聊"]').classList.add('active');
        document.querySelector('.sidebar-icon[title="私聊"]').classList.remove('active');
        showGroupsPanel();
        renderGroups();
        saveState(state);
    });

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
        const editingId = Number(e.target.dataset.editingId);

        if (editingId === -1) { // 如果是发言统筹器
            const modelServiceId = Number(document.getElementById('agent-model-service').value);
            const contextMessageCount = Number(document.getElementById('agent-context-count').value);
            updateOrchestratorAgent({ modelServiceId, contextMessageCount });
        } else { // 普通智能体
            const agentData = {
                name: document.getElementById('agent-name').value,
                description: document.getElementById('agent-description').value,
                prompt: document.getElementById('agent-prompt').value,
                modelServiceId: Number(document.getElementById('agent-model-service').value)
            };
            if (editingId) {
                updateAgent(editingId, agentData);
            } else {
                addAgent(agentData);
            }
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

        if (!state.currentTopicId) {
            alert('请先选择一个话题开始聊天！');
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }

        const currentTopic = state.topics.find(t => t.id === state.currentTopicId);
        if (!currentTopic) {
            alert('错误：找不到当前话题！');
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }

        const currentGroup = state.groups.find(g => g.id === currentTopic.groupId);
        if (!currentGroup) {
            alert('错误：找不到当前群组！');
            sendBtn.disabled = false;
            messageInput.disabled = false;
            return;
        }

        const controller = new AbortController(); // 为本次消息发送创建一个 AbortController
        const signal = controller.signal;

        // 将 AbortController 存储在 state 中，以便“中止”按钮可以访问它
        state.currentAbortController = controller;

        try {
            if (state.chatMode === 'private') {
                // 私聊模式下的逻辑 (与单个智能体对话)
                const targetAgentId = currentGroup.agentIds[0]; // 假设私聊模式下群组只有一个智能体
                const targetAgent = state.agents.find(a => a.id === targetAgentId);
                if (!targetAgent) {
                    alert('错误：找不到目标智能体！');
                    return;
                }

                const modelService = state.modelServices.find(s => s.id === targetAgent.modelServiceId);
                if (!modelService) {
                    alert(`错误：找不到ID为 ${targetAgent.modelServiceId} 的模型服务！`);
                    return;
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
                    return;
                }

                const history = state.messages[state.currentTopicId] || [];
                const messagesToSend = history.slice(Math.max(0, history.length - apiConfig.contextMessageCount));

                let aiMessage = null;

                await getAiResponse(
                    apiConfig,
                    targetAgent.prompt,
                    messagesToSend,
                    (delta) => {
                        if (delta.content) {
                            if (aiMessage === null) {
                                aiMessage = addMessage({ author: targetAgent.name, text: delta.content });
                            } else {
                                aiMessage.text += delta.content;
                            }
                            renderMessages();
                        }
                    },
                    () => {
                        saveState(state);
                        console.log('Stream complete.');
                    },
                    (error) => {
                        if (aiMessage) {
                            aiMessage.text += `\n\n**错误:** ${error.message}`;
                        } else {
                            addMessage({ author: 'Error', text: error.message });
                        }
                        renderMessages();
                        saveState(state);
                    },
                    signal // 传递 signal
                );

            } else if (state.chatMode === 'group') {
                // 群聊模式下的逻辑 (由发言统筹器协调)
                await startGroupChatFlow(currentTopic, currentGroup, signal); // 传递 signal

            } else {
                alert('未知聊天模式！');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            alert(`发送消息失败: ${error.message}`);
        } finally {
            // --- 恢复输入 ---
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
            state.currentAbortController = null; // 清除 AbortController
            saveState(state); // 确保在任何情况下都保存状态
        }
    }

    sendBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // --- 中止按钮事件 ---
    stopBtn.addEventListener('click', () => {
        if (state.orchestratorChainActive) {
            state.orchestratorChainActive = false; // 中断群聊工作流
            alert('群聊工作流已中止。'); // 临时提示
            if (state.currentAbortController) {
                state.currentAbortController.abort(); // 中断正在进行的 API 请求
                state.currentAbortController = null;
            }
        }
        sendBtn.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    });
});