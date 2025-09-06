import * as ui from './ui.js';
import * as state from './state.js';
import { saveState } from './storage.js';
import { getAiResponse } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    ui.initUI();

    // --- 视图/面板切换 ---
    document.querySelector('.sidebar').addEventListener('click', (e) => {
        const icon = e.target.closest('.sidebar-icon');
        if (icon) {
            ui.showPanel(icon.dataset.panel);
        }
    });

    // --- 通用列表项点击事件 (用于编辑) ---
    document.querySelector('.panel').addEventListener('click', (e) => {
        const item = e.target.closest('.list-item');
        if (!item || e.target.closest('.delete-btn')) return; // 忽略删除按钮的点击

        const id = Number(item.dataset.id);
        if (item.classList.contains('topic-item')) {
            state.setCurrentTopic(id);
            ui.renderTopics();
            ui.renderMessages();
            saveState(state.state);
        } else if (item.classList.contains('group-item')) {
            ui.openGroupModal(state.state.groups.find(e => e.id === id));
        } else if (item.classList.contains('agent-item')) {
            ui.openAgentModal(state.state.agents.find(e => e.id === id));
        } else if (item.classList.contains('service-item')) {
            ui.openServiceModelModal(state.state.modelServices.find(e => e.id === id));
        }
    });
    
    // --- 通用删除按钮事件 ---
    document.querySelector('.panel').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;
        
        const id = Number(deleteBtn.dataset.id);
        const item = deleteBtn.closest('.list-item');

        if (!confirm('确定要删除吗？')) return;

        if (item.classList.contains('topic-item')) state.deleteTopic(id);
        else if (item.classList.contains('group-item')) state.deleteGroup(id);
        else if (item.classList.contains('agent-item')) state.deleteAgent(id);
        else if (item.classList.contains('service-item')) state.deleteModelService(id);
        
        ui.renderAll();
        saveState(state.state);
    });

    // --- “添加”按钮事件 ---
    document.getElementById('add-topic-btn').addEventListener('click', () => ui.openTopicModal());
    document.getElementById('add-group-btn').addEventListener('click', () => ui.openGroupModal());
    document.getElementById('add-agent-btn').addEventListener('click', () => ui.openAgentModal());
    document.getElementById('add-service-btn').addEventListener('click', () => ui.openServiceModelModal());

    // --- 模态框关闭事件 ---
    document.getElementById('modals').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-cancel') || e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal-overlay');
            if(modal) modal.classList.add('hidden');
        }
    });

    // --- 表单提交事件 ---
    // (由于表单太多，我们将它们合并到一个事件监听器中)
    document.getElementById('modals').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));
        const editingId = Number(form.dataset.editingId);

        switch (form.id) {
            case 'topic-form':
                editingId ? state.updateTopic(editingId, data) : state.addTopic(data);
                break;
            case 'group-form':
                data.agentIds = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(cb => Number(cb.value));
                editingId ? state.updateGroup(editingId, data) : state.addGroup(data);
                break;
            case 'agent-form':
                editingId ? state.updateAgent(editingId, data) : state.addAgent(data);
                break;
            case 'service-form':
                editingId ? state.updateModelService(editingId, data) : state.addModelService(data);
                break;
        }

        ui.renderAll();
        saveState(state.state);
        form.closest('.modal-overlay').classList.add('hidden');
    });

    // --- 发送消息事件 ---
    const sendBtn = document.querySelector('.send-btn');
    const messageInput = document.querySelector('.chat-input-area textarea');

    async function handleSendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        state.addMessage({ author: state.state.currentUser.name, text });
        ui.renderMessages();
        saveState(state.state);
        messageInput.value = '';
        messageInput.focus();
        
        sendBtn.disabled = true;
        messageInput.disabled = true;

        const currentTopic = state.state.topics.find(t => t.id === state.state.currentTopicId);
        if (!currentTopic) { alert('错误：找不到当前话题！'); return; }
        
        const currentGroup = state.state.groups.find(g => g.id === currentTopic.groupId);
        if (!currentGroup || currentGroup.agentIds.length === 0) { alert('错误：话题所属的群组为空！'); return; }

        const firstAgentId = currentGroup.agentIds[0];
        const agent = state.state.agents.find(a => a.id === firstAgentId);
        if (!agent) { alert('错误：找不到群组内的智能体！'); return; }

        const modelService = state.state.modelServices.find(s => s.id === agent.modelServiceId);
        if (!modelService || !modelService.apiKey) {
            alert('请在“设置”中为此智能体关联的模型服务配置API Key！');
            ui.showPanel('services');
            return;
        }

        const history = state.state.messages[state.state.currentTopicId] || [];
        let aiMessage = null;

        await getAiResponse(
            modelService,
            agent.prompt,
            history,
            (delta) => {
                if (delta.content) {
                    if (aiMessage === null) {
                        aiMessage = state.addMessage({ author: agent.name, text: delta.content });
                    } else {
                        aiMessage.text += delta.content;
                    }
                    ui.renderMessages();
                }
            },
            () => saveState(state.state),
            (error) => {
                const errorMsg = { author: 'Error', text: error.message };
                if (aiMessage) aiMessage.text += `\n\n**错误:** ${error.message}`;
                else state.addMessage(errorMsg);
                ui.renderMessages();
                saveState(state.state);
            }
        ).finally(() => {
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