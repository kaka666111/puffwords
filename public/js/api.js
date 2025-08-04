// public/js/api.js

// 基础请求函数（统一处理错误和响应）
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`请求失败，状态码：${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        throw error; // 抛出错误，由调用方处理
    }
}

// 具体API接口配置
const API_BASE_URL = 'http://localhost:3000'; // 后端服务地址

export const api = {
    // 获取数据
    getData: async () => {
        const url = `${API_BASE_URL}/api/data`;
        return await fetchData(url);
    },

    // 提交数据（示例）
    postData: async (payload) => {
        const url = `${API_BASE_URL}/api/data`;
        return await fetchData(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
};

