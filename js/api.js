// 负责与后端 MCP 服务器的通信

const API_BASE_URL = 'http://localhost:3000/api'; // 假设的 API 地址

// 示例：发送消息
export async function sendMessage(message) {
    // const response = await fetch(`${API_BASE_URL}/chat`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ message })
    // });
    // return response.json();
    console.log('API: 发送消息', message);
    return { success: true }; // 暂时返回模拟数据
}

// 可以在这里添加更多与 API 交互的函数