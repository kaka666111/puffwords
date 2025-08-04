// public/js/rewards.js
setInterval(async () => {
    try {
        await fetch('/get-user-info', {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
    } catch {
        localStorage.removeItem("token");
        window.location.href = '/';
    }
}, 300000);

// 新增：图片模态框函数
function openModal(e) {
    const imgSrc = e.target.getAttribute('src');
    
    const modalHTML = `
        <div class="modal-overlay" id="reward-modal">
            <div class="modal-content">
                <button class="close-modal">&times;</button>
                <img class="modal-image" src="${imgSrc}" alt="放大查看奖励">
                <p>点击任意位置关闭</p>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('reward-modal');
    
    modal.style.display = 'flex';
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    document.addEventListener('keydown', function escClose(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escClose);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    // ===== 初始化检查 =====
    const token = localStorage.getItem("token");
    if (!token || token.split(".").length !== 3) {
        alert("登录已过期，请重新登录");
        localStorage.removeItem("token");
        window.location.href = "/pre.html";
        return;
    }

    // ===== 返回主页按钮 =====
    document.getElementById("return-home-btn").addEventListener("click", async (e) => {
        e.preventDefault();
        try {
            const refreshRes = await fetch('/get-user-info', {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const newToken = refreshRes.headers.get('New-Token');
            if (newToken) localStorage.setItem("token", newToken);
            window.location.href = "/home.html";
        } catch (error) {
            console.error("跳转失败:", error);
            localStorage.removeItem("token");
            window.location.href = "/pre.html";
        }
    });

    // ===== 初始化UI =====
    const rewardsContainer = document.getElementById("rewards-container");
    rewardsContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>奖励加载中...</p>
        </div>
    `;

    // ===== 抽奖功能 =====
    const drawButton = document.getElementById("draw-reward-btn");
    
    if (drawButton) {
        const newButton = drawButton.cloneNode(true);
        drawButton.parentNode.replaceChild(newButton, drawButton);
        
        newButton.addEventListener("click", async () => {
            newButton.disabled = true;
            newButton.textContent = "抽奖中...";
            
            try {
                const currentPoints = await calculateRemainingPoints();
                console.log("当前积分:", currentPoints);
                
                if (currentPoints < 50) {
                    alert(`需要50分才能抽奖，当前只有${currentPoints}分`);
                    resetDrawButton(newButton);
                    return;
                }

                // 获取用户当前最高分数的模式作为抽奖模式
                const modes = ["easy", "normal", "hard", "expert", "legend"];
                let highestScoreMode = "normal"; // 默认使用normal模式
                let highestScore = 0;
                
                try {
                    // 获取所有模式的分数
                    const progressDataList = await Promise.all(
                        modes.map(mode =>
                            fetch(`/get-progress?mode=${mode}`, {
                                headers: {
                                    "Authorization": `Bearer ${token}`,
                                    "Content-Type": "application/json"
                                }
                            }).then(r => r.json())
                        )
                    );
                    
                    // 找出分数最高的模式
                    progressDataList.forEach((data, index) => {
                        const score = data.progress?.totalScore || 0;
                        if (score > highestScore) {
                            highestScore = score;
                            highestScoreMode = modes[index];
                        }
                    });
                } catch (error) {
                    console.error("获取最高分模式失败，使用默认模式:", error);
                }
                
                console.log("使用模式抽奖:", highestScoreMode);
                
                // 获取当前已有的奖励列表，用于防止抽到重复奖励
                const rewardsRes = await fetch('/get-rewards', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const rewardsData = await rewardsRes.json();
                const existingRewards = rewardsData.rewards || [];
                
                const response = await fetch('/draw-reward', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        mode: highestScoreMode,
                        existingRewards: existingRewards // 传递已有奖励列表到服务器
                    })
                });

                if (!response.ok) {
                    throw new Error(`请求失败: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.success) {
                    // 重新计算可用积分 - 注意：总分不应该减少，只是可用积分减少
                    const newPoints = await calculateRemainingPoints();
                    const totalScore = await getTotalScore();
                    
                    document.getElementById("draw-result").innerHTML = `
                        <div class="new-reward">
                            <p>恭喜获得新奖励！</p>
                            <p>总得分: ${totalScore}</p>
                            <p>剩余积分: ${newPoints}</p>
                            <img src="${result.reward}" alt="新奖励">
                        </div>
                    `;
                    // 不刷新页面，而是直接更新UI显示
                    loadPointsDisplay();
                    // 延迟后重新加载奖励列表，而不是整个页面
                    setTimeout(async () => {
                        try {
                            const rewardsResponse = await fetch("/get-rewards", {
                                headers: { Authorization: `Bearer ${token}` },
                                cache: "no-cache"
                            });
                            if (rewardsResponse.ok) {
                                const rewardsData = await rewardsResponse.json();
                                renderRewards(rewardsData.rewards || []);
                            }
                        } catch (error) {
                            console.error("重新加载奖励失败:", error);
                        }
                    }, 1500);
                } else {
                    throw new Error(result.error || "抽奖失败");
                }
            } catch (error) {
                console.error("抽奖错误:", error);
                alert(error.message);
                resetDrawButton(newButton);
            }
        });
    }

    function resetDrawButton(btn) {
        btn.disabled = false;
        btn.textContent = "🎉 消耗50分抽奖一次";
        loadPointsDisplay();
    }

    // ===== 积分功能 =====
    // 获取总得分（不受抽奖影响）
    async function getTotalScore() {
        try {
            // 定义所有游戏模式
            const modes = ["easy", "normal", "hard", "expert", "legend"];
            let totalScore = 0;
            
            // 并行请求所有模式的进度
            const progressResponses = await Promise.all(
                modes.map(mode =>
                    fetch(`/get-progress?mode=${mode}`, {
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
            
            return totalScore;
        } catch (error) {
            console.error("获取总分失败:", error);
            return 0;
        }
    }
    
    // 计算可用于抽奖的积分
    async function calculateRemainingPoints() {
        try {
            // 获取总得分
            const totalScore = await getTotalScore();
            
            // 获取已解锁的奖励数量
            const rewardsRes = await fetch('/get-rewards', {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-cache" // 添加no-cache确保获取最新数据
            });
            const rewardsData = await rewardsRes.json();
            const rewardsCount = rewardsData.rewards?.length || 0;
            
            // 计算已消耗的积分
            const usedPoints = 50 * rewardsCount;
            
            // 返回可用积分（总分减去已使用的积分）
            const remainingPoints = Math.max(totalScore - usedPoints, 0);
            console.log("积分计算 - 总分:", totalScore, "已用积分:", usedPoints, "剩余积分:", remainingPoints);
            return remainingPoints;
        } catch (error) {
            console.error("积分计算失败:", error);
            return 0;
        }
    }

    async function loadPointsDisplay() {
        // 获取总得分
        const totalScore = await getTotalScore();
        const totalScoreElement = document.getElementById("total-score");
        if (totalScoreElement) totalScoreElement.textContent = totalScore;
        
        // 获取可用积分
        const points = await calculateRemainingPoints();
        const pointsElement = document.getElementById("current-points");
        if (pointsElement) pointsElement.textContent = points;
        
        // 更新积分说明
        const pointsInfoElement = document.querySelector(".points-info");
        if (pointsInfoElement) {
            pointsInfoElement.textContent = "(可用积分 = 总得分 - 已使用积分)";
        }
    }

    // ===== 加载奖励数据 =====
    try {
        const response = await fetch("/get-rewards", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-cache"
        });

        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);

        const data = await response.json();
        renderRewards(data.rewards || []);
    } catch (error) {
        console.error("加载奖励失败:", error);
        rewardsContainer.innerHTML = `
            <div class="error-message">
                <img src="/img/error.png" alt="错误图标">
                <p>${error.message}</p>
                <button onclick="window.location.reload()">🔄 重新加载</button>
            </div>
        `;
    }

    // 修改后的renderRewards函数
    function renderRewards(rewards) {
        if (rewards.length === 0) {
            rewardsContainer.innerHTML = `
                <div class="no-rewards">
                    <img src="/img/empty-box.png" alt="空箱子">
                    <p>尚未获得任何奖励</p>
                </div>
            `;
            return;
        }

        // 鼓励话语数组
const encouragingMessages = [
    "每天进步一点点，未来会感谢现在努力的自己！",
    "今天的汗水，是明天的礼物。",
    "脚步虽小，坚持就能走远。",
    "慢慢来，但别停下来。",
    "你比自己想象的更厉害！",
    "进步不在快慢，而在始终向前。",
    "每一次尝试都离成功更近一步",
    "坚持是最酷的超能力",
    "成长就像植物，需要时间和耐心",
    "你已经比昨天更优秀了"
];

rewardsContainer.innerHTML = rewards.map((path, index) => {
    // 随机选择一条鼓励话语
    const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
    
    return `
        <div class="reward-card">
            <img src="${path}" 
                 alt="奖励图片-${index + 1}" 
                 onerror="this.src='/img/error-image.png'"
                 data-reward="${path}">
            <div class="reward-info">
                <span class="unlock-time"></span>
                <span class="cost">${randomMessage}</span>
            </div>
        </div>
    `;
}).join("");

        // 新增：为所有图片添加点击事件
        document.querySelectorAll('.reward-card img').forEach(img => {
            img.addEventListener('click', openModal);
        });
    }
    loadPointsDisplay();
});

function getUnlockTime(path) {
    const filename = path.split("/").pop();
    const timestamp = filename.split("_")[1]?.split(".")[0] || "未知时间";
    return timestamp ? `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}` : "未知时间";
}
