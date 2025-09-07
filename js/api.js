// 负责调用 OpenAI 兼容的 API

/**
 * 获取 AI 的流式响应
 * @param {object} apiConfig - { url, apiKey, modelId, temperature, topP }
 * @param {string} systemPrompt - 系统提示词
 * @param {Array<object>} history - 历史消息数组 (已根据 contextMessageCount 截断)
 * @param {function} onStream - 处理数据流的回调函数
 * @param {function} onComplete - 完成时的回调
 * @param {function} onError - 错误处理回调
 */
export async function getAiResponse(apiConfig, systemPrompt, history, onStream, onComplete, onError) {
    try {
        const payload = {
            model: apiConfig.modelId,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history.map(msg => ({
                    role: msg.author === 'Samm' ? 'user' : 'assistant',
                    content: msg.text
                }))
            ],
            stream: true,
            temperature: apiConfig.temperature,
            top_p: apiConfig.topP
        };

        const response = await fetch(apiConfig.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.apiKey}`
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
        }

        if (!response.body) {
            throw new Error("ReadableStream not available");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (onComplete) onComplete();
                break;
            }
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataString = line.substring(6);
                    if (dataString === '[DONE]') {
                        if (onComplete) onComplete();
                        return;
                    }
                    try {
                        const data = JSON.parse(dataString);
                        if (data.choices && data.choices[0].delta) {
                            onStream(data.choices[0].delta);
                        }
                    } catch (e) {
                        console.error('Error parsing stream data chunk:', dataString, e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching AI response:', error);
        if (onError) onError(error);
    }
}