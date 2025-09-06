// AI 智能体群聊应用的主脚本文件
import { initUI, showTopicsPanel, showAgentsPanel } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('应用已加载，主脚本开始执行。');
    initUI();
    
    // 为侧边栏图标添加事件监听器
    document.querySelector('.sidebar-icon[title="聊天"]').addEventListener('click', showTopicsPanel);
    document.querySelector('.sidebar-icon[title="智能体"]').addEventListener('click', showAgentsPanel);

    // 后续功能将在这里初始化
});