const serverURL = window.location.origin;

// public/js/page1.js
import { api } from './api.js';


// pre.js（仅保留一个监听器）
document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            try {
                const response = await fetch(`${serverURL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    window.location.href = "/home.html";
                } else {
                    alert("登录失败：" + (data.error || "未知错误"));
                }
            } catch (error) {
                alert("❌ 请求失败：" + error.message);
            }
        });
    }
});

// 🎯 创建玩家
async function createPlayer() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
        alert("❌ 请输入用户名和密码！");
        return;
    }

    try {
        const response = await fetch(`${serverURL}/players`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();
        
        if (response.status === 409) { // 409 Conflict 通常用于资源冲突
            alert("❌ 已有同名账户！");
        } else if (response.ok) {
            alert(result.message || "✅ 注册成功！");
        } else {
            alert(result.error || "❌ 注册失败，请重试！");
        }
    } catch (error) {
        alert("❌ 请求失败：" + error.message);
    }
}


// 🎯 登录玩家
async function loginPlayer() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!username || !password) {
        alert("❌ 请输入用户名和密码！");
        return;
    }

    try {
        const response = await fetch(`${serverURL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("token", data.token);
            window.location.href = "/home.html";
        } else {
            alert(data.error); // 修复了 result.error 的错误
        }
    } catch (error) {
        alert("❌ 登录失败：" + error.message);
    }
}



// 🎯 查询玩家信息
async function getPlayerInfo() {
    const searchInput = document.getElementById("searchUsername").value.trim();
    const playerInfoDiv = document.getElementById("playerInfo");

    if (!searchInput) {
        alert("❌ 请输入用户名！");
        return;
    }

    playerInfoDiv.innerHTML = "<p>⌛ 正在查询，请稍等...</p>";

    try {
        const response = await fetch(`${serverURL}/players/${searchInput}`);
        const data = await response.json();

        if (data.error) {
            playerInfoDiv.innerHTML = `<p style="color: red;">❌ ${data.error}</p>`;
        } else {
            playerInfoDiv.innerHTML = `
                <h3>🎮 玩家信息</h3>
                <p><strong>总分:</strong> ${data.total_score}</p>
                <h4>📊 关卡进度:</h4>
                <ul>
                    ${data.progress.length > 0 
                        ? data.progress.map(p => `
                            <li><strong>类别:</strong> ${p.category}, 
                                <strong>分数:</strong> ${p.score}, 
                                <strong>关卡:</strong> ${p.level}</li>`).join("")
                        : "<li>无进度数据</li>"
                    }
                </ul>
            `;
        }
    } catch (error) {
        playerInfoDiv.innerHTML = "<p style='color: red;'>⚠️ 查询失败，请检查服务器！</p>";
    }
}

document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault(); // 阻止默认刷新
    await createPlayer(); // 调用注册逻辑
});




