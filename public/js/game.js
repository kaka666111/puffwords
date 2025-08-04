console.log("Game.js 里的 Token:", localStorage.getItem("token"));
console.log("Token in localStorage:", localStorage.getItem("token"));
// 游戏状态变量
let scores = {};
let levels = {};
let rewards = {};
let progress = {};
let currentWordIndex = 0;
let score = 0;
let currentWord = '';
let expectedLetters = [];
let clickedLetters = [];
let currentWords = []; // ✅ 确保 `currentWords` 是全局变量，避免 `showNextWord()` 访问不到
let errorCounts = {}; // 新增：记录每个单词的错误次数
let words = []; // 你的词库
// 在全局变量区添加
let returnTimer = null;
let isPracticeMode = false;

// 音效对象
const bubblePopSound = new Audio('/assets/bubble-sound.mp3'); // 使用新的泡泡音效
const greatSound = new Audio('/assets/great-sound.mp3'); // 使用新的成功音效
const failSound = new Audio('/assets/fail.mp3'); // 温和的失败音效

// DOM 元素
const bubblesContainer = document.getElementById('bubbles-container');
const chineseMeaning = document.querySelector('.chinese-meaning');
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const customWordsBtn = document.getElementById('customWordsBtn');
const startGameBtn = document.getElementById('startGameBtn');
const customWordsModal = document.getElementById('customWordsModal');
const wordCountInput = document.getElementById('wordCount');
const wordInputs = document.getElementById('wordInputs');
const submitCustomWords = document.getElementById('submitCustomWords');

// 图片搜索功能
async function searchWordImage(word) {
    try {
      // 1. 先尝试从Unsplash获取图片
      const unsplashResponse = await fetch(`https://api.unsplash.com/search/photos?query=${word}&per_page=1`, {
        headers: {
          Authorization: ' ' // 替换为你的真实Key
        }
      });
      
      const unsplashData = await unsplashResponse.json();
      if (unsplashData.results?.length > 0) {
        return unsplashData.results[0].urls.small;
      }
  
      // 2. 如果Unsplash没有，使用占位图
      return `https://via.placeholder.com/300x200.png?text=${word}`;
      
    } catch (error) {
      console.error('图片加载失败:', error);
      return null;
    }
  }

document.addEventListener("DOMContentLoaded", function () {

          // ✅ 第一步：检查是否是练习模式
    const customWordData = localStorage.getItem("customPracticeWord");
    if (customWordData) {
        try {
            console.log("进入错题练习模式");
            isPracticeMode = true;
            const wordObj = JSON.parse(customWordData);
            
            // ✅ 直接设置当前单词列表
            currentWords = [{
                english: wordObj.word,
                chinese: wordObj.meaning || "（暂无中文）"
            }];
            
            localStorage.removeItem("customPracticeWord");
            
            // ✅ 跳过正常模式初始化
            initGame();
            return;
        } catch (e) {
            console.error("解析练习单词失败:", e);
        }
    }

    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const customWordsModal = document.getElementById('customWordsModal');

    if (backToHomeBtn && customWordsModal) {
        backToHomeBtn.addEventListener('click', () => {
            console.log('返回按钮被点击');
            customWordsModal.style.display = 'none';
            window.location.href = "/home.html"; // 使用绝对路径
        });
    }

    // ✅ 以下是正常模式初始化 ↓↓↓
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            if (confirm("你确定要重新开始吗？字母位置会重新打乱！")) {
                console.log("点击了重新开始按钮！");
                currentWordIndex = 0;
                score = 0;
                showMessage("重新开始咯！祝你好运！", "success");
                initGame();
            }
        });
    } else {
        console.warn("❌ 没找到 startGameBtn 元素");
    }

    const selectedMode = localStorage.getItem("selectedMode") || "easy";
    console.log("当前选择模式:", selectedMode);

    switch (selectedMode) {
        case "easy":
            if (!isPracticeMode) { 
            currentWords = wordList_easy;
            customWordsBtn.style.display = 'none';
            }
            break;
        case "normal":
            if (!isPracticeMode) { 
            currentWords = wordList_normal;
            customWordsBtn.style.display = 'none';
            }
            break;
        case "hard":
            if (!isPracticeMode) { 
            currentWords = wordList_hard;
            customWordsBtn.style.display = 'none';
            }
            break;
        case "expert": if (!isPracticeMode) { 
            currentWords = wordList_expert;
            customWordsBtn.style.display = 'none';
            }
            break;
        case "legend":
            if (!isPracticeMode) { 
            currentWords = wordList_legend;
            customWordsBtn.style.display = 'none';
            }
            break;
        case "custom":
            customWordsModal.style.display = "block";
            customWordsBtn.style.display = "none";
            return;
        default:
            currentWords = wordList_easy;
            customWordsBtn.style.display = 'none';
    }

    console.log("加载词库:", currentWords);

    initGame();
});


    // ✅ 传入选择的词库，开始游戏
    async function initGame() {
        console.log("游戏初始化开始");

        // 隐藏自定义模式相关按钮
    const customWordsModal = document.getElementById('customWordsModal');
    if (customWordsModal) {
        customWordsModal.style.display = 'none';
    }
    

        if (returnTimer) {
            clearTimeout(returnTimer);
            returnTimer = null;
        }
    
        // 检查用户Token
        const token = localStorage.getItem("token");
        if (!token || token.split(".").length !== 3) {
            console.warn("无效的Token格式");
            window.location.href = "/pre.html";
            return;
        }
    
        try {
            // 加载用户进度
            const progressData = await loadUserProgress(token);
    
            // 设置进度（从服务器返回的字段）
            currentWordIndex = progressData.currentIndex;
            score = progressData.score;
            wordsCompleted = progressData.wordsCompleted;
            currentLevel = progressData.level;
    
            // 更新 UI 显示分数
            scoreElement.textContent = score;
    
            console.log("加载的进度:", progressData);
    
            // 检查词库是否加载成功
            if (!currentWords || currentWords.length === 0) {
                throw new Error("词库未加载!");
            }
    
            console.log("游戏界面加载完成");
            showNextWord(); // ✅ 加载单词
    
        } catch (error) {
            console.error("初始化游戏失败:", error);
    
            // 出现错误时默认从头开始
            currentWordIndex = 0;
            score = 0;
            showNextWord();
        }
    }
    
    
    
    // 独立的进度加载函数
    async function loadUserProgress(token) {
    
        try {
            const selectedMode = localStorage.getItem("selectedMode") || "easy";
            const response = await fetch(`http://localhost:3000/get-progress?mode=${selectedMode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
    
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem("token");
                    window.location.href = "/pre.html";
                    return null;
                }
    
                let errorDetails = "";
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.details || errorData.error || "";
                } catch (e) {
                    errorDetails = "无法解析错误详情";
                }
                
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorDetails}`);
            }
    
            const data = await response.json();
            console.log("获取存档数据:", data);
            return {
                currentIndex: data.progress.currentIndex || 0,
                score: data.progress.totalScore || 0,
                wordsCompleted: data.progress.wordsCompleted || 0,
                level: data.progress.level || 1
            };
    
        } catch (error) {
            console.error("获取存档失败详情:", error);
            
            if (error.name === "TypeError") {
                console.warn("网络错误，3秒后重试...");
                await new Promise(resolve => setTimeout(resolve, 3000));
                return loadUserProgress(token); // 重试一次
            }
            
            return { currentIndex: 0, score: 0, wordsCompleted: 0, level: 1 };
        }
    }

    
    // 使用进度数据更新游戏状态
    function updateGameWithProgress(progressData) {
        if (!progressData) return;
    
        // 计算当前关卡 (每50个单词1关)
        const currentLevel = Math.floor(progressData.wordsCompleted / 50) + 1;
        
        // 更新UI显示
        if (document.getElementById("progressDisplay")) {
            document.getElementById("progressDisplay").innerText = 
                `当前关卡：${currentLevel} | 总分：${progressData.totalScore} | 单词数：${progressData.wordsCompleted}`;
        }
        
        // 更新游戏状态
        score = progressData.totalScore || 0;
        scoreElement.textContent = score;
    }
    
    // 原有的showNextWord保持不变
   async function showNextWord() {
        // ✅ 添加调试信息
        console.log("当前模式:", isPracticeMode ? "练习模式" : "正常模式");
        console.log("当前单词列表:", currentWords);
        
        if (currentWordIndex >= currentWords.length) {
            if (isPracticeMode) {
                showMessage('练习完成！返回错题本...', 'success');
                setTimeout(() => {
                    window.location.href = "/wrong-words.html";
                }, 1500);
                return;
            }

            const isCustomMode = localStorage.getItem("selectedMode") === "custom";
        
            if (isCustomMode) {
                showMessage('自定义单词完成！返回首页', 'success');
                // 清除现有定时器
                if (returnTimer) clearTimeout(returnTimer);
                // 设置新定时器
                returnTimer = setTimeout(() => {
                    redirectToHome();
                }, 1000);
            } else {
                showMessage('恭喜完成所有单词！', 'success');
            }
            return;
        }
    
        clearBubbles();
        currentWord = currentWords[currentWordIndex].english;
        chineseMeaning.textContent = currentWords[currentWordIndex].chinese;
        expectedLetters = currentWord.split('');
        clickedLetters = [];
        
        // ✅ 新增图片加载代码（插入在这里！）
    const wordImage = await searchWordImage(currentWord);
    if (wordImage) {
        const imgContainer = document.createElement('div');
        imgContainer.innerHTML = `<img src="${wordImage}" style="max-width:200px; margin:10px auto;">`;
        chineseMeaning.appendChild(imgContainer);
    }

        createBubbles(currentWord);
    }


// 添加音效错误处理
bubblePopSound.addEventListener('error', () => {
    console.warn('无法加载泡泡音效');
});

greatSound.addEventListener('error', () => {
    console.warn('无法加载成功音效');
});

failSound.addEventListener('error', () => {
    console.warn('无法加载失败音效');
});



// 检查两个泡泡是否重叠
function isOverlapping(rect1, rect2, padding = 10) {
    return !(rect1.right + padding < rect2.left || 
             rect1.left > rect2.right + padding || 
             rect1.bottom + padding < rect2.top || 
             rect1.top > rect2.bottom + padding);
}

// 创建字母泡泡
function createBubbles(word) {
    const letters = word.split('').sort(() => Math.random() - 0.5);
    const bubblePositions = [];

    setTimeout(() => {
        const bubbleContainer = document.getElementById('bubbles-container');
        const containerWidth = bubbleContainer.offsetWidth;
        const containerHeight = bubbleContainer.offsetHeight;
        const padding = 20;
        const availableWidth = containerWidth - padding * 2;
        const availableHeight = containerHeight - padding * 2;

        // **计算泡泡大小，避免泡泡太大或太小**
        const estimatedSize = Math.min(
            Math.sqrt((availableWidth * availableHeight) / letters.length) * 0.9,
            100 // 最大大小
        );
        const bubbleSize = Math.max(estimatedSize, 50); // 最小大小

        // **检查重叠函数**
        function isOverlapping(newX, newY, size, positions) {
            return positions.some(pos => {
                const dx = newX - pos.x;
                const dy = newY - pos.y;
                return Math.sqrt(dx * dx + dy * dy) < size * 1.2; // 1.2倍间距，防止挤在一起
            });
        }

        // **尝试随机放置泡泡**
        letters.forEach(letter => {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            bubble.textContent = letter;
            bubble.style.width = `${bubbleSize}px`;
            bubble.style.height = `${bubbleSize}px`;

            const hue = Math.random() * 360;
            bubble.style.backgroundColor = `hsl(${hue}, 50%, 80%)`;

            let placed = false;
            let attempts = 0;
            const maxAttempts = 100;

            while (!placed && attempts < maxAttempts) {
                const x = padding + Math.random() * (availableWidth - bubbleSize);
                const y = padding + Math.random() * (availableHeight - bubbleSize);

                if (!isOverlapping(x, y, bubbleSize, bubblePositions)) {
                    bubble.style.left = `${x}px`;
                    bubble.style.top = `${y}px`;
                    bubblePositions.push({ x, y });
                    placed = true;
                }
                attempts++;
            }

            // **如果随机放置失败，则使用网格分布**
            if (!placed) {
                const cols = Math.floor(availableWidth / bubbleSize);
                const rows = Math.ceil(letters.length / cols);
                const gridSpacing = Math.min(availableWidth / cols, availableHeight / rows);

                let row = Math.floor(bubblePositions.length / cols);
                let col = bubblePositions.length % cols;

                let x = padding + col * gridSpacing;
                let y = padding + row * gridSpacing;

                bubble.style.left = `${x}px`;
                bubble.style.top = `${y}px`;
                bubblePositions.push({ x, y });
            }

            bubble.addEventListener('click', () => handleBubbleClick(bubble, letter));
            bubbleContainer.appendChild(bubble);
        });
    }, 0);
}


            

// 处理泡泡点击
function handleBubbleClick(bubble, letter) {
    console.log("点击的字母:", letter, "期望的字母:", expectedLetters[clickedLetters.length]);
    const expectedLetter = expectedLetters[clickedLetters.length];
    
    if (letter === expectedLetter) {
        clickedLetters.push(letter);
        bubble.style.visibility = 'hidden';
        
        // 添加音效播放错误处理
        try {
            bubblePopSound.currentTime = 0; // 重置音效，允许快速重复播放
            bubblePopSound.play().catch(err => console.warn('播放泡泡音效失败:', err));
        } catch(err) {
            console.warn('播放泡泡音效失败:', err);
        }
        
        if (clickedLetters.length === expectedLetters.length) {
            const newIndex = currentWordIndex + 1;
        const newWordsCompleted = 1; // 每次完成1个单词
        
        updateGameProgress(1, newWordsCompleted, newIndex).then(data => {
            if (data?.currentLevel) {
                showLevelTip(data.currentLevel);
                if (data.currentLevel > currentLevel) {
                    // 解锁新关卡奖励
                    showRewardImage(data.currentLevel);
                }
                currentLevel = data.currentLevel;
            }
        });
            showMessage('太棒了！', 'success');
            
            try {
                greatSound.currentTime = 0;
                greatSound.play().catch(err => console.warn('播放成功音效失败:', err));
            } catch(err) {
                console.warn('播放成功音效失败:', err);
            }
            
            setTimeout(() => {
                hideMessage();
                currentWordIndex++;
                showNextWord();
            }, 1500); // 延长显示时间
        }
    } else {
        // 记录错词
        const currentWordObj = currentWords[currentWordIndex];
        recordWrongWord(currentWordObj.english, currentWordObj.chinese);

        // 新增：错误计数
        errorCounts[currentWord] = (errorCounts[currentWord] || 0) + 1;
        showMessage('再接再厉！', 'fail');
        
        try {
            failSound.currentTime = 0;
            failSound.play().catch(err => console.warn('播放失败音效失败:', err));
        } catch(err) {
            console.warn('播放失败音效失败:', err);
        }

        // 新增：检查错误次数
        if (errorCounts[currentWord] >= 3) {
            showHint(currentWord);
            errorCounts[currentWord] = 0; // 重置计数
        }
        
        setTimeout(() => {
            hideMessage();
            clearBubbles();
            showNextWord();
        }, 1500); // 延长显示时间
    }
}

// 添加记录错词函数
async function recordWrongWord(word, meaning) {
    const token = localStorage.getItem("token");
    if (!token) return;

    const selectedMode = localStorage.getItem("selectedMode") || "easy";
    
    try {
        await fetch("http://localhost:3000/add-wrong-word", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                word,
                meaning,
                mode: selectedMode
            })
        });
    } catch (error) {
        console.error("记录错词失败:", error);
    }
}

function showHint(correctWord) {
    const hintModal = document.createElement('div');
    hintModal.className = 'hint-modal';
    hintModal.innerHTML = `
        <div class="hint-content">
            <h3>提示</h3>
            <p>正确单词是：<strong>${correctWord}</strong></p>
            <button onclick="this.parentElement.parentElement.remove()">知道了</button>
        </div>
    `;
    
    document.body.appendChild(hintModal);
    
    // 5秒后自动消失
    setTimeout(() => {
        hintModal.remove();
    }, 5000);
}
// 添加更新游戏进度的函数
async function updateGameProgress(scoreToAdd, wordsCompleted, currentIndex) {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    const selectedMode = localStorage.getItem("selectedMode") || "easy";
    try {
        const response = await fetch("http://localhost:3000/update-progress", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mode: selectedMode,
                score: scoreToAdd,
                wordsCompleted: wordsCompleted,
                currentIndex: currentIndex
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("进度更新成功:", data);

        // ✅ 加上这个判断！
        if (data.success && data.levelUp) {
            console.log("🎉 获得奖励：", data.reward);
            showLevelTip(data.newLevel); // 提示升级
            showRewardImage(data.reward); // 传入奖励图片路径
        }

    } catch (error) {
        console.error("更新进度失败:", error);
    }
}


function showLevelTip(level) {
    const tip = document.createElement("div");
    tip.className = "level-tip";
    tip.innerText = `🎉 恭喜升到第 ${level} 关！`;
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 3000);
}

function showRewardImage(imagePath) {
    const rewardDiv = document.createElement("div");
    rewardDiv.className = "reward-popup";
    rewardDiv.innerHTML = `
        <div class="popup-content">
            <p>🎁 获得奖励！</p>
            <img src="${imagePath}" alt="奖励图片" />
        </div>
    `;
    document.body.appendChild(rewardDiv);

    // 自动移除
    setTimeout(() => rewardDiv.remove(), 4000);
}


// 显示消息
function showMessage(text, type = 'normal') {
    const messageElement = document.getElementById('message');
    const messageText = messageElement.querySelector('.message-text');
    const messageEmoji = messageElement.querySelector('.message-emoji');
    
    messageElement.className = 'message ' + type + '-message';
    messageText.innerHTML = text;
    messageEmoji.innerHTML = '';

    // 清理旧元素
    messageElement.querySelectorAll('.countdown, .progress-bar').forEach(el => el.remove());

    // 自定义模式完成处理
    if (type === 'success' && text.includes('自定义单词完成')) {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress-inner" style="width: 100%"></div>';
        messageElement.appendChild(progressBar);

        let countdown = 10;
        const progressInner = progressBar.querySelector('.progress-inner');
        
        const interval = setInterval(() => {
            countdown--;
            progressInner.style.width = `${countdown * 10}%`;
            
            if (countdown <= 0) {
                clearInterval(interval);
                redirectToHome();
            }
        }, 1000);
    } else {
        // 普通成功消息显示图片
        switch(type) {
            case 'success':
        if (text.includes("重新开始咯")) {
            messageEmoji.innerHTML = ""; // 不显示图片
        } else {
            const imgSrc = 'assets/WOW.png';
            messageEmoji.innerHTML = `<img src="${imgSrc}" alt="成功" style="width: 300px; height: auto;">`;
        }
        break;
            case 'fail':
                messageEmoji.textContent = '💪';
                break;
        }
        messageText.textContent = text;
    }

    const timeout = type === 'success' ? 2000 : 1500; // 成功消息2秒，失败消息1.5秒
    setTimeout(() => hideMessage(), timeout);

    messageElement.style.display = 'flex';

    if (text.includes('1秒后返回首页')) {
        messageText.textContent = text;
        let countdown = 1;
        const countdownElement = document.createElement('div');
        countdownElement.className = 'countdown';
        messageElement.appendChild(countdownElement);

        const interval = setInterval(() => {
            countdown--;
            countdownElement.textContent = `${countdown}秒`;
            if (countdown <= 0) clearInterval(interval);
        }, 1000);
    }

}
    

// 隐藏消息
function hideMessage() {
    const messageElement = document.getElementById('message');
    messageElement.style.display = 'none';
}

// 清除所有泡泡
function clearBubbles() {
    bubblesContainer.innerHTML = '';
}

// 修改自定义单词按钮的点击事件
customWordsBtn.addEventListener('click', function() {
    customWordsModal.style.display = 'block';
});

wordCountInput.addEventListener('change', () => {
    const count = parseInt(wordCountInput.value);
    wordInputs.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        wordInputs.innerHTML += `
            <div class="input-group">
                <input type="text" placeholder="中文含义" class="chinese-input">
                <input type="text" placeholder="英文单词" class="english-input">
            </div>
        `;
    }
});

submitCustomWords.addEventListener('click', () => {
    const chineseInputs = document.querySelectorAll('.chinese-input');
    const englishInputs = document.querySelectorAll('.english-input');
    const customWordsList = [];
    
     // 在提交时清除定时器
     if (returnTimer) {
        clearTimeout(returnTimer);
        returnTimer = null;
    }

    for (let i = 0; i < chineseInputs.length; i++) {
        if (chineseInputs[i].value && englishInputs[i].value) {
            customWordsList.push({
                chinese: chineseInputs[i].value,
                english: englishInputs[i].value.toLowerCase()
            });
        }
    }
    
    if (customWordsList.length > 0) {
        currentWords = customWordsList;
        customWordsModal.style.display = 'none';

        // 隐藏确定按钮
        submitCustomWords.style.display = 'none';

        initGame();
    }
});

// 开始游戏按钮事件
startGameBtn.addEventListener('click', initGame);

// --- 自定义单词搜索功能开始 ---
const wordSearch = document.getElementById('wordSearch');
const searchWordBtn = document.getElementById('searchWordBtn');
const searchResults = document.getElementById('searchResults');

// 搜索单词函数
function searchWords() {
    const searchTerm = wordSearch.value.toLowerCase();
    if (!searchTerm) return;
    const allWords = [
        ...wordList_easy,
        ...wordList_normal,
        ...wordList_hard,
        ...wordList_expert,
        ...wordList_legend
    ];
    // 先筛选以searchTerm开头的单词
    const startsWith = allWords.filter(word => word.english.toLowerCase().startsWith(searchTerm));
    // 再筛选包含但不是开头的单词
    const contains = allWords.filter(word => !word.english.toLowerCase().startsWith(searchTerm) && word.english.toLowerCase().includes(searchTerm));
    // 合并并分别排序
    const results = [
        ...startsWith.sort((a, b) => a.english.localeCompare(b.english)),
        ...contains.sort((a, b) => a.english.localeCompare(b.english))
    ].slice(0, 200);
    searchResults.innerHTML = '';
    results.forEach(word => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<span>${word.english} - ${word.chinese}</span><button class="add-btn" data-english="${word.english}" data-chinese="${word.chinese}">+</button>`;
        item.querySelector('.add-btn').addEventListener('click', function() {
            addWordToCustomList(this.dataset.english, this.dataset.chinese);
        });
        searchResults.appendChild(item);
    });
}

// 把单词添加到自定义列表
function addWordToCustomList(english, chinese) {
    const count = document.querySelectorAll('.chinese-input').length;

    if (count === 0) {
        wordCountInput.value = 1;
        wordInputs.innerHTML = `
            <div class="input-group">
                <input type="text" placeholder="中文含义" class="chinese-input" value="${chinese}">
                <input type="text" placeholder="英文单词" class="english-input" value="${english}">
            </div>
        `;
    } else {
        wordCountInput.value = count + 1;
        wordInputs.innerHTML += `
            <div class="input-group">
                <input type="text" placeholder="中文含义" class="chinese-input" value="${chinese}">
                <input type="text" placeholder="英文单词" class="english-input" value="${english}">
            </div>
        `;
    }

    // 滚动到底部
    wordInputs.scrollTop = wordInputs.scrollHeight;
}

// 绑定搜索按钮和回车键
searchWordBtn.addEventListener('click', searchWords);
wordSearch.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchWords();
    }
});
// --- 自定义单词搜索功能结束 ---



function showWowImage() {
    const wowImage = document.createElement('img');
    wowImage.src = 'WOW.png';
    wowImage.className = 'wow-image'; // 确保使用正确的类名
    document.body.appendChild(wowImage);
    
    // 其他逻辑...
} 

// 添加跳转函数
function redirectToHome() {
     if (returnTimer) clearTimeout(returnTimer);
    window.location.href = "/home.html"; // 根据实际首页路径调整
}

function redirectToWrongBook() {
    clearTimeout(returnTimer);
    window.location.href = "/wrong-words.html"; // 改成你错题本页面的路径
}

// 添加导入文件功能
document.getElementById('importWordsBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // 显示文件名
    document.getElementById('fileName').textContent = file.name;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        processImportedWords(content);
    };
    reader.readAsText(file);
});

function processImportedWords(text) {
    // 支持多种分隔方式：换行、逗号、分号、制表符等
    const lines = text.split(/[\n,;\t]+/).filter(line => line.trim());
    
    // 清空现有输入
    wordInputs.innerHTML = '';
    
    // 设置单词数量
    wordCountInput.value = lines.length;
    
    // 创建输入框
    for (let i = 0; i < lines.length; i++) {
        // 尝试自动分割中英文（假设格式为"中文,英文"或"中文 英文"）
        const parts = lines[i].split(/[,，\s]+/).filter(part => part.trim());
        
        wordInputs.innerHTML += `
            <div class="input-group">
                <input type="text" placeholder="中文含义" class="chinese-input" 
                       value="${parts.length > 1 ? parts[0] : ''}">
                <input type="text" placeholder="英文单词" class="english-input"
                       value="${parts.length > 1 ? parts[1] : parts[0] || ''}">
            </div>
        `;
    }
    
    // 自动滚动到输入区域
    wordInputs.scrollIntoView({ behavior: 'smooth' });
}