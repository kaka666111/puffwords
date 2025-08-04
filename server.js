require("dotenv").config();

const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const winston = require("winston");
const path = require("path");
const db = require('./db');
const bcrypt = require("bcrypt");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const getUnsplashImage = require('./utils/unsplash');
require('dotenv').config();

const port = 3000; // 后端服务端口
const app = express();

app.use(express.json());
app.use(cors({
    exposedHeaders: ['New-Token'] // ✅ 添加此配置
}));

const morgan = require("morgan");
app.use(morgan("combined")); // 记录 HTTP 请求日志
const SECRET_KEY = 'your_secret_key'; // **🆕 添加 JWT 密钥（建议用环境变量存储）**


// 🆕 添加 Token 解析中间件**
// ==================== 智能验证中间件（最终版） ====================
const authenticateToken = (req, res, next) => {
    // ✅ 新增：从URL参数和Header获取Token
    const token = req.query.token 
        || req.headers.authorization?.split(" ")[1];

    // ✅ 重构：智能判断请求类型
    const isApiRequest = () => {
        // 识别API路由的新规则
        const apiPatterns = [
            /^\/api/,          // 所有/api开头的路由
            /^\/players(\/|$)/, // players相关路由
            /^\/get-/,          // 所有get-开头的接口
            /^\/update-/        // 所有update-开头的接口
        ];
        return apiPatterns.some(pattern => pattern.test(req.path));
    };

    // ✅ 优化：认证失败处理逻辑
    const handleAuthFailure = (isApi) => {
        if (isApi) {
            return res.status(401)
                .set('Cache-Control', 'no-store')
                .json({ code: "UNAUTHORIZED", error: "请重新登录" });
        } else {
            // ✅ 重要：清除无效Token避免循环跳转
            res.clearCookie('token');
            return res.redirect("/pre.html?from=" + encodeURIComponent(req.originalUrl));
        }
    };

    // ✅ 新增：调试日志输出
    console.log(`[Auth] Path: ${req.path}, API: ${isApiRequest()}, Token: ${!!token}`);

    if (!token) {
        return handleAuthFailure(isApiRequest());
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error(`[Auth Error] ${err.name}: ${err.message}`);
            return handleAuthFailure(isApiRequest());
        }
        
        // ✅ 新增：Token有效期检查
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            console.warn(`[Auth] Token已过期 (exp: ${decoded.exp}, now: ${now})`);
            return handleAuthFailure(isApiRequest());
        }

        // ============== 新增 Token 自动续期逻辑 ==============
    // 检查剩余时间是否小于30分钟（1800秒）
    if (decoded.exp - now < 1800) { 
        const newToken = jwt.sign(
            { id: decoded.id, username: decoded.username }, 
            SECRET_KEY, 
            { expiresIn: "2h" }
        );
        res.set('New-Token', newToken); // 通过响应头发送新Token

        // ✅ 新增：立即刷新客户端Token存储
        res.on('finish', () => {
            db.query("UPDATE players SET last_active = NOW() WHERE id = ?", [decoded.id]);
        });
    }

        req.user = decoded;
        next();
    });
};
// ✅ **登录页面**
// 调整中间件顺序
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pre.html"));
});

// 静态文件服务
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// 受保护的路由
app.get("/home", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/game", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 在已有的受保护路由下方添加以下代码
app.get("/rewards.html", authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "rewards.html"));
});

// 搜索接口
app.get('/api/search', async (req, res) => {
    const { word } = req.query;
    
    if (!word) {
      return res.status(400).json({ error: '请输入单词' });
    }
  
    try {
      const imageData = await getUnsplashImage(word);
      
      if (imageData) {
        res.json({
          imageUrl: imageData.url,
          credit: imageData.credit
        });
      } else {
        res.status(404).json({ error: '未找到相关图片' });
      }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '服务器错误' });
      }
    });
    
    app.listen(3000, () => {
      console.log('服务器运行在 http://localhost:3000');
    });

const validatePlayerInput = (req, res, next) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }
    if (username.length > 20) {
      return res.status(400).json({ error: "用户名过长" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "密码至少需要8位" });
    }
    next();
};

// 添加数据库错误处理中间件
app.use((err, req, res, next) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error('数据库连接丢失，尝试重新连接...');
        // 这里可以添加重新连接逻辑
    } else if (err.code === 'ER_NO_SUCH_TABLE') {
        console.error('表不存在:', err.message);
    }
    next(err);
});

// ✅ **处理登录**
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT id, password FROM players WHERE username = ?", [username], (err, results) => {
      if (err) {
          console.error("❌ 数据库查询失败:", err);
          return res.status(500).json({ error: "服务器错误" });
      }

      if (results.length === 0) {
          return res.status(400).json({ error: "用户名不存在" });
      }

      const storedPassword = results[0].password;
      bcrypt.compare(password, storedPassword, (err, match) => {
          if (err) {
              console.error("❌ 密码校验失败:", err);
              return res.status(500).json({ error: "服务器错误" });
          }

          if (match) {
              const token = jwt.sign({ id: results[0].id, username }, SECRET_KEY, { expiresIn: "2h" });
              res.json({ success: true, message: "🎉 登录成功！", token }); // 🔴 **返回 Token**
          } else {
              res.status(400).json({ error: "❌ 密码错误" });
          }
      });
  });
});





// ✅ **🆕 获取用户信息**
app.get("/get-user-info", authenticateToken, (req, res) => {
    db.query("SELECT username FROM players WHERE id = ?", [req.user.id], 
        (err, results) => {
            if (err || results.length === 0) {
                return res.status(401).json({ error: "用户不存在" });
            }
            res.json({ username: results[0].username });
        }
    );
});


// ✅ **玩家 API**
// 🎯 1️⃣ 创建玩家
app.post("/players", validatePlayerInput, (req, res) => {
    const { username, password } = req.body;

    db.query("SELECT id FROM players WHERE username = ?", [username], (err, results) => {
        if (err) {
            console.error("❌ 数据库查询失败:", err);
            return res.status(500).json({ error: "服务器错误" });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: "用户名已存在" });
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error("❌ 密码加密失败:", err);
                return res.status(500).json({ error: "服务器错误" });
            }

            db.query("INSERT INTO players (username, password) VALUES (?, ?)", 
                [username, hashedPassword], 
                (err, result) => {
                    if (err) {
                        console.error("❌ 数据库插入失败:", err);
                        return res.status(500).json({ error: "服务器错误" });
                    }
                    res.json({ message: "✅ 玩家创建成功", playerId: result.insertId });
                }
            );
        });
    });
});

// 🎯 2️⃣ 获取所有玩家信息（安全增强版）
app.get("/players", authenticateToken, (req, res) => { // 添加中间件
    db.query("SELECT id, username, created_at FROM players", (err, results) => { // 移除敏感字段
        if (err) {
            return res
                .status(500)
                .set('Cache-Control', 'no-store') // 禁止缓存错误信息
                .json({ 
                    error: "数据库查询失败",
                    code: "DB_QUERY_ERROR" 
                });
        }

        res
            .set({
                'Cache-Control': 'no-store', // 禁止缓存响应
                'X-Content-Type-Options': 'nosniff' // 防止MIME嗅探
            })
            .json(results.map(user => ({
                ...user,
                // 可选：格式化时间戳
                created_at: new Date(user.created_at).toISOString() 
            })));
    });
});
// 🎯 3️⃣ 获取玩家总分和关卡信息
app.get("/players/:username", (req, res) => {
    const { username } = req.params;
    db.query(
        `SELECT 
            p.id,
            pr.mode AS category,
            pr.total_score,
            pr.current_index,
            pr.words_completed,
            pr.level,
            pr.reward_images
        FROM players p
        LEFT JOIN progress pr ON p.id = pr.player_id
        WHERE p.username = ?`,
        [username],
       
        (err, results) => {
            if (err) {
                console.error("❌ 获取玩家数据失败：", err);
                return res.status(500).json({ error: "服务器错误，请稍后再试" });
            }

            if (results.length === 0) {
                res.status(404).json({ error: "未找到该玩家" });
            } else {
                const playerData = {
                    total_score: results[0].total_score||0,
                    progress: results.map(row => ({
                        category: row.category,
                        total_score: row.total_score || 0,
                        current_index: row.current_index || 0,
                        words_completed: row.words_completed || 0,
                        level: row.level || 1,
                        reward_images: row.reward_images
                    }))
                };
                res.json(playerData);
            }
        }
    );
});

app.post("/update-progress", authenticateToken, (req, res) => {
    const { mode, score, wordsCompleted, currentIndex } = req.body;
    const userId = req.user.id;

    // 从连接池中获取连接
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: "获取数据库连接失败" });

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: "事务启动失败" });
            }

            // 插入或更新 progress 数据
            connection.query(`
                INSERT INTO progress 
                (
                    player_id, mode, current_index, 
                    total_score, words_completed, level,
                    unlocked_rewards
                )
                VALUES (?, ?, ?, ?, ?, FLOOR((? + ?) / 50) + 1, JSON_ARRAY())
                ON DUPLICATE KEY UPDATE
                    current_index = VALUES(current_index),
                    total_score = total_score + VALUES(total_score),
                    words_completed = words_completed + VALUES(words_completed),
                    level = FLOOR((words_completed + VALUES(words_completed)) / 50) + 1,
                    unlocked_rewards = COALESCE(unlocked_rewards, JSON_ARRAY())
            `, 
            [userId, mode, currentIndex, score, wordsCompleted, wordsCompleted, wordsCompleted],
            (err, result) => {
                if (err) {
                    return connection.rollback(() => {
                        connection.release();
                        console.error("进度更新失败:", err);
                        res.status(500).json({ error: "进度保存失败" });
                    });
                }

                // 如果刚好完成了50、100...个单词，触发奖励
                if (wordsCompleted % 50 === 0) {
                    const newLevel = Math.floor(wordsCompleted / 50) + 1;

                    connection.query(`
                        SELECT id, image_path 
                        FROM reward_library 
                        WHERE min_level <= ?
                        ORDER BY RAND() * weight DESC 
                        LIMIT 1
                    `, [newLevel], (err, rewards) => {
                        if (err || !rewards.length) {
                            return connection.rollback(() => {
                                connection.release();
                                console.error("奖励获取失败:", err);
                                res.json({ 
                                    success: true,
                                    newIndex: currentIndex,
                                    levelUp: false
                                });
                            });
                        }

                        const reward = rewards[0];

                        // 把奖励 ID 加入 unlocked_rewards 字段
                        connection.query(`
                            UPDATE progress SET
                                unlocked_rewards = JSON_ARRAY_APPEND(
                                    CAST(COALESCE(unlocked_rewards, '[]') AS JSON),
                                    '$',
                                    ?
                                )
                            WHERE player_id = ? AND mode = ?
                        `, [reward.id, userId, mode], (err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    connection.release();
                                    console.error("奖励保存失败:", err);
                                    res.status(500).json({ error: "奖励保存失败" });
                                });
                            }

                            // ✅ 提交事务
                            connection.commit(err => {
                                connection.release();
                                if (err) {
                                    return connection.rollback(() => {
                                        console.error("事务提交失败:", err);
                                        res.status(500).json({ error: "系统错误" });
                                    });
                                }

                                res.json({
                                    success: true,
                                    newIndex: currentIndex,
                                    levelUp: true,
                                    newLevel,
                                    reward: reward.image_path
                                });
                            });
                        });
                    });
                } else {
                    // 不触发奖励，直接提交
                    connection.commit(err => {
                        connection.release();
                        if (err) {
                            return connection.rollback(() => {
                                console.error("事务提交失败:", err);
                                res.status(500).json({ error: "系统错误" });
                            });
                        }

                        res.json({ 
                            success: true,
                            newIndex: currentIndex,
                            levelUp: false
                        });
                    });
                }
            });
        });
    });
});


// ✅ 获取用户所有奖励图片
app.get("/get-rewards", authenticateToken, (req, res) => {
    db.query(`
        SELECT rl.image_path 
        FROM progress p
        JOIN reward_library rl 
            ON JSON_CONTAINS(p.unlocked_rewards, CAST(rl.id AS JSON))
        WHERE p.player_id = ?
    `, [req.user.id], (err, results) => {
        res.json({ rewards: results.map(r => r.image_path) });
    });
});

// 🎯 4️⃣ 获取玩家获得的所有奖励
app.get("/rewards/:username", (req, res) => {
    const { username } = req.params;
    db.query(
        "SELECT progress.reward_image FROM players JOIN progress ON players.id = progress.player_id WHERE players.username = ?",
        [username],
        (err, results) => {
            if (err) throw err;
            res.json(results);
        }
    );
});

// server.js 添加新端点
app.post("/draw-reward", authenticateToken, (req, res) => {
    const { mode } = req.body;
    const userId = req.user.id;
    
    // 使用事务确保数据一致性
    db.getConnection((err, connection) => {
        if (err) return res.status(500).json({ error: "数据库连接失败" });

        connection.beginTransaction(err => {
            if (err) {
                connection.release();
                return res.status(500).json({ error: "事务启动失败" });
            }

            // 1. 获取所有模式的积分总和
            connection.query(`
                SELECT SUM(total_score) as total_points
                FROM progress
                WHERE player_id = ?
            `, [userId], (err, totalResults) => {
                if (err || !totalResults.length) {
                    return connection.rollback(() => {
                        connection.release();
                        res.status(400).json({ error: "无法获取总积分" });
                    });
                }
                
                const totalPoints = totalResults[0].total_points || 0;
                
                // 2. 获取已解锁奖励数量
                connection.query(`
                    SELECT mode, unlocked_rewards
                    FROM progress
                    WHERE player_id = ?
                `, [userId], (err, rewardsResults) => {
                    if (err) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(400).json({ error: "无法获取奖励信息" });
                        });
                    }
                    
                    // 计算已使用的积分（每个奖励消耗50分）
                    let usedPoints = 0;
                    rewardsResults.forEach(result => {
                        if (result.unlocked_rewards) {
                            try {
                                const rewards = JSON.parse(result.unlocked_rewards);
                                usedPoints += rewards.length * 50;
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    });
                    
                    // 计算可用积分
                    const availablePoints = totalPoints - usedPoints;
                    
                    // 3. 检查是否至少有50分可用于抽奖
                    if (availablePoints < 50) {
                        return connection.rollback(() => {
                            connection.release();
                            res.status(400).json({ error: `需要至少50分才能抽奖，当前可用积分: ${availablePoints}` });
                        });
                    }
                    
                    // 4. 获取指定模式的进度信息（用于抽奖和更新）
                    connection.query(`
                        SELECT words_completed, total_score, unlocked_rewards
                        FROM progress
                        WHERE player_id = ? AND mode = ?
                        FOR UPDATE
                    `, [userId, mode], (err, modeResults) => {
                        if (err || !modeResults.length) {
                            return connection.rollback(() => {
                                connection.release();
                                res.status(400).json({ error: "无法获取指定模式的进度" });
                            });
                        }
                        
                        const progress = modeResults[0];
                        
                        // 5. 执行抽奖
                        connection.query(`
                            SELECT id, image_path
                            FROM reward_library
                            WHERE min_level <= ?
                            ORDER BY RAND() * weight DESC
                            LIMIT 1
                        `, [Math.floor(progress.words_completed / 50) + 1], (err, rewards) => {
                            if (err || !rewards.length) {
                                return connection.rollback(() => {
                                    connection.release();
                                    res.status(500).json({ error: "抽奖失败" });
                                });
                            }
                            
                            const reward = rewards[0];
                            
                            // 6. 扣除50分并保存奖励（仍然在指定模式中记录）
                            connection.query(`
                                UPDATE progress SET
                                    unlocked_rewards = JSON_ARRAY_APPEND(
                                        COALESCE(unlocked_rewards, '[]'),
                                        '$',
                                        ?
                                    )
                                WHERE player_id = ? AND mode = ?
                            `, [reward.id, userId, mode], (err) => {
                                if (err) {
                                    return connection.rollback(() => {
                                        connection.release();
                                        res.status(500).json({ error: "奖励保存失败" });
                                    });
                                }
                                
                                // 7. 提交事务
                                connection.commit(err => {
                                    connection.release();
                                    if (err) {
                                        return connection.rollback(() => {
                                            res.status(500).json({ error: "系统错误" });
                                        });
                                    }
                                    
                                    res.json({
                                        success: true,
                                        reward: reward.image_path,
                                        remainingPoints: availablePoints - 50 // 返回剩余可用积分
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
// 修正后的 get-progress 端点
// 修改后的端点（移除mode过滤）
app.get("/get-progress", authenticateToken, (req, res) => {
    const { mode } = req.query;
    const userId = req.user.id;

    let query, params;
    if (mode) {
        // 模式指定时，返回该模式的数据
        query = "SELECT current_index, total_score, words_completed, level FROM progress WHERE player_id = ? AND mode = ?";
        params = [userId, mode];
    } else {
        // 模式未指定时，返回所有模式的总分
        query = "SELECT SUM(total_score) as total_score FROM progress WHERE player_id = ?";
        params = [userId];
    }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: "数据库错误" });
        
        const response = mode 
            ? { progress: { currentIndex: results[0]?.current_index, totalScore: results[0]?.total_score } }
            : { progress: { totalScore: results[0]?.total_score || 0 } };

        res.json(response);
    });
});

// 获取用户错词数量
app.get("/get-wrong-words-count", authenticateToken, (req, res) => {
    db.query(
        "SELECT COUNT(*) as count FROM wrong_words WHERE player_id = ?",
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: "数据库错误" });
            res.json({ count: results[0].count });
        }
    );
});

// 添加错词到错词本
app.post("/add-wrong-word", authenticateToken, (req, res) => {
    const { word, meaning, mode } = req.body;
    const playerId = req.user.id;

    db.query(
        `INSERT INTO wrong_words (player_id, word, meaning, mode, error_count)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE 
             error_count = error_count + 1,
             last_error_time = CURRENT_TIMESTAMP`,
        [playerId, word, meaning, mode],
        (err) => {
            if (err) {
                console.error("保存错词失败:", err);
                return res.status(500).json({ error: "保存错词失败" });
            }
            res.json({ success: true });
        }
    );
});

// 获取用户错词
app.get("/get-wrong-words", authenticateToken, (req, res) => {
    db.query(
        "SELECT * FROM wrong_words WHERE player_id = ? ORDER BY last_error_time DESC",
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: "数据库错误" });
            res.json(results);
        }
    );
});

// 修改删除错词端点，支持按ID或单词删除
app.post("/delete-wrong-word", authenticateToken, (req, res) => {
    const { id, word } = req.body;
    const playerId = req.user.id;
    
    let query, params;
    if (id) {
        query = "DELETE FROM wrong_words WHERE id = ? AND player_id = ?";
        params = [id, playerId];
    } else if (word) {
        query = "DELETE FROM wrong_words WHERE word = ? AND player_id = ?";
        params = [word, playerId];
    } else {
        return res.status(400).json({ error: "需要提供ID或单词" });
    }

    db.query(query, params, (err) => {
        if (err) {
            console.error("删除错词失败:", err);
            return res.status(500).json({ error: "删除失败" });
        }
        res.json({ success: true });
    });
});



// ✅ **前端测试 API**
app.get('/api/data', (req, res) => {
    const data = {
        message: 'Hello from the backend!',
        timestamp: new Date()
    };
    res.json(data);
});

// ✅ **获取和存储用户设置**
let userSettings = {
    username: 'guest',
    theme: 'light'
};

app.get('/api/settings', (req, res) => {
    res.json(userSettings);
});

app.post('/api/settings', (req, res) => {
    const newSettings = req.body;
    userSettings = { ...userSettings, ...newSettings };
    console.log("用户设置已更新：", userSettings);
    res.json({ success: true, message: '设置已保存！' });
});


// ✅ **创建日志管理**
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: path.join(__dirname, "logs", "error.log"), level: "error" }),
        new winston.transports.File({ filename: path.join(__dirname, "logs", "combined.log") })
    ]
});

// ✅ **服务器启动日志**
logger.info("🎮 服务器启动成功");

// ✅ **捕获未处理的错误**
process.on("uncaughtException", err => {
    logger.error("⚠️ 未捕获的异常", err);
});

// ✅ **404 处理优化**,
app.use((req, res, next) => {
    if (!req.originalUrl.startsWith("/css/") && !req.originalUrl.startsWith("/js/") && !req.originalUrl.startsWith("/img/")) {
        res.status(404).json({ error: "资源未找到：" + req.originalUrl });
    } else {
        next();
    }
});

// ✅ **服务器启动**
app.listen(port, () => {
  logger.info(`🎮 服务器运行在 http://localhost:${port}`);
  console.log(`✅ 服务器运行在 http://localhost:${port}`);
});


