// js/settings.js

// 1. 动态生成表单
async function loadSettingsForm() {
    try {
      // 从后端获取当前设置
      const response = await fetch('http://localhost:3000/api/settings');
      const settings = await response.json();
  
      // 创建表单元素
      const form = document.createElement('form');
      form.innerHTML = `
        <div>
          <label>用户名：</label>
          <input type="text" id="username" value="${settings.username}">
        </div>
        <div>
          <label>主题：</label>
          <select id="theme">
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>浅色</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>深色</option>
          </select>
        </div>
        <button type="submit">保存</button>
      `;
  
      // 将表单插入页面
      document.body.appendChild(form);
  
      // 监听表单提交事件
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
      });
    } catch (error) {
      alert('加载设置失败！');
    }
  }
  
  // 2. 保存设置到后端
  async function saveSettings() {
    const newSettings = {
      username: document.getElementById('username').value,
      theme: document.getElementById('theme').value
    };
  
    try {
      const response = await fetch('http://localhost:3000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const result = await response.json();
      alert(result.message); // 显示保存结果
    } catch (error) {
      alert('保存失败！');
    }
  }
  
  // 初始化页面
  document.addEventListener('DOMContentLoaded', loadSettingsForm);