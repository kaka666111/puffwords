document.addEventListener("DOMContentLoaded", () => {
    fetchWrongWords();
});

async function fetchWrongWords() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch("/get-wrong-words", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("获取错词失败");

        const data = await response.json();
        console.log("错词数据：", data);

        renderWrongWords(data);
    } catch (err) {
        console.error("加载错词本失败:", err);
        const container = document.getElementById("wrong-words-container");
        if (container) {
            container.innerHTML = "<p style='color: red;'>加载错词本失败，请稍后重试。</p>";
        }
    }
}

function renderWrongWords(wrongWords) {
    const container = document.getElementById("wrong-words-container");

    if (!container) return;

    if (wrongWords.length === 0) {
        container.innerHTML = "<p>你暂时没有错词记录，继续加油！🎉</p>";
        return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
        <thead>
            <tr>
                <th>错词</th>
                <th>最后错题时间</th>
            </tr>
        </thead>
        <tbody>
    ${wrongWords.map(word => `
        <tr>
            <td class="clickable-word"
                style="cursor: pointer; color: blue;"
                data-word="${word.word}"
                data-meaning="${word.meaning || word.chinese || "暂无中文"}">
                ${word.word}
            </td>
            <td>${new Date(word.last_error_time).toLocaleString()}</td>
        </tr>
    `).join("")}
</tbody>

    `;

    container.innerHTML = ""; // 清空旧内容
    container.appendChild(table);

   // ✅ 添加点击事件跳转练习
document.querySelectorAll(".clickable-word").forEach(cell => {
    // 在点击事件处理中添加标记
    cell.addEventListener("click", () => {
        const word = cell.getAttribute("data-word");
        const meaning = cell.getAttribute("data-meaning");
        
        // ✅ 清除可能残留的模式标记
        localStorage.removeItem("selectedMode");
        
        // ✅ 设置练习模式标记
        localStorage.setItem("customPracticeWord", JSON.stringify({
            word: word,
            meaning: meaning
        }));
        
        console.log("跳转到练习模式，单词:", word);
        window.location.href = "/game";
    });
});
}

