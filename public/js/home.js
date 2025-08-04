document.addEventListener("DOMContentLoaded", async function () {
    // ====================== 全局配置 ======================
    const serverURL = window.location.origin;
    const loadingIndicator = document.createElement("div");
    loadingIndicator.className = "loading-indicator";
    loadingIndicator.innerHTML = `
        <div class="spinner"></div>
        <p>加载中，请稍候...</p>
    `;
    document.body.appendChild(loadingIndicator);

    // ====================== Token 验证 ======================
    const token = localStorage.getItem("token");
    
    // 情况1: 无Token直接拦截
    if (!token) {
        alert("请先登录！");
        localStorage.removeItem("token");
        window.location.href = "/";
        return;
    }

    try {
        // ====================== 获取用户信息 ======================
        const userInfoResponse = await fetch(`${serverURL}/get-user-info`, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        }).then(response => { // ✅ 正确位置：在fetch返回的Promise上调用.then
            const newToken = response.headers.get('New-Token');
            if (newToken) {
                localStorage.setItem("token", newToken);
            }
            return response; // 必须返回response以继续处理
        }).catch(err => {
            // ✅ 新增：网络错误处理
            console.error("网络连接异常:", err);
            localStorage.removeItem("token");
            window.location.reload();
        });
        

        // 情况2: Token失效拦截
        if (!userInfoResponse.ok) {
            throw new Error(`身份验证失败 (${userInfoResponse.status})`);
        }

        const userInfo = await userInfoResponse.json();
        
        // 更新用户名显示
        document.getElementById("username").textContent = `玩家: ${userInfo.username}`;

        // ====================== 获取游戏进度 ======================
const modes = ["easy", "normal", "hard", "expert", "legend"];
let totalScore = 0;

try {
    // 并行请求所有模式的进度
    const progressResponses = await Promise.all(
        modes.map(mode => 
            fetch(`${serverURL}/get-progress?mode=${mode}`, {
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })
        )
    );

    // 验证所有响应
    const invalidResponse = progressResponses.find(r => !r.ok);
    if (invalidResponse) throw new Error("获取进度失败");

    // 提取并累加分数
    const progressDataList = await Promise.all(
        progressResponses.map(r => r.json())
    );
    
    totalScore = progressDataList.reduce(
        (sum, data) => sum + (data.progress?.totalScore || 0), 0
    );

    // 更新总得分显示
    document.getElementById("progress").textContent = `总得分: ${totalScore}`;

} catch (error) {
    console.error("分数汇总失败:", error);
    document.getElementById("progress").textContent = "分数加载失败";
}

        // ====================== 事件监听绑定 ======================
        // 奖励按钮（单次绑定）
        document.getElementById("reward-btn").addEventListener("click", () => {
            window.location.href = "/rewards.html";
        });

        // 游戏模式按钮
        document.querySelectorAll(".mode-btn").forEach(button => {
            button.addEventListener("click", function() {
                const selectedMode = this.dataset.mode;
                localStorage.setItem("selectedMode", selectedMode);
                window.location.href = "/index.html";
            });
        });

        // 自定义模式按钮
        document.getElementById("custom-mode-btn").addEventListener("click", () => {
            localStorage.setItem("selectedMode", "custom");
            window.location.href = "/index.html";
        });

        // 退出登录按钮
        document.getElementById("logout-btn").addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "/";
        });

    } catch (error) {
        console.error("❌ 初始化失败:", error);
        alert(error.message.includes("401") ? "登录已过期，请重新登录" : "初始化失败");
        localStorage.removeItem("token");
        window.location.href = "/";
    } finally {
        // ====================== 移除加载动画 ======================
        setTimeout(() => {
            loadingIndicator.style.opacity = "0";
            setTimeout(() => loadingIndicator.remove(), 300);
        }, 500);
    }
});

// ====================== 加载动画样式 ======================
const style = document.createElement("style");
style.textContent = `
    .loading-indicator {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        transition: opacity 0.3s;
    }
    
    .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);


document.getElementById('wrong-words-btn').addEventListener('click', () => {
    window.location.href = 'wrong-words.html';
  });
  