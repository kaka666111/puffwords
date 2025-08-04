require("dotenv").config(); // 读取 .env 配置

const mysql = require("mysql2");

// ✅ 使用连接池管理 MySQL 连接
const db = mysql.createPool({
    connectionLimit: 10, // 最大连接数
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// ✅ 测试连接
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ 数据库连接失败：", err);
    } else {
        console.log("✅ 成功连接到 MySQL 数据库");
        connection.release(); // 释放连接
    }
});

module.exports = db; // ✅ 导出数据库连接池
