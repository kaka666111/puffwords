-- 玩家信息表
CREATE TABLE players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL-- 必须添加此字段
);

-- 新增奖励图库表
CREATE TABLE reward_library (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_path VARCHAR(255) NOT NULL UNIQUE COMMENT '图片路径，如/rewards/dragon.png',
    min_level INT DEFAULT 1 COMMENT '解锁所需最低关卡',
    weight INT DEFAULT 10 COMMENT '掉落权重（越高越容易获得）'
);

-- 修改进度表
CREATE TABLE progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    mode ENUM('easy','normal','hard','expert','legend') NOT NULL,
    current_index INT DEFAULT 0,
    total_score INT DEFAULT 0,
    words_completed INT DEFAULT 0,
    level INT DEFAULT 1 COMMENT '当前关卡（=words_completed/50 +1）',
    unlocked_rewards JSON COMMENT '已解锁的奖励ID数组',
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_player_mode (player_id, mode)
);

-- 添加索引优化查询
CREATE INDEX idx_mode ON progress(mode);
CREATE INDEX idx_player ON progress(player_id);

-- 插入示例奖励（实际根据你的图片库调整）
INSERT INTO reward_library (image_path, min_level, weight) VALUES
('/img/rewards/reward1.png', 1, 10),  -- 基础奖励
('/img/rewards/reward2.png', 1, 10);
-- ('/img/rewards/reward3.png', 3, 5),    -- 从第3关开始可能掉落
-- ('/img/rewards/reward4.png', 5, 3),    -- 稀有奖励
-- ('/img/rewards/reward5.png', 10, 1);   -- 超稀有奖励

ALTER TABLE progress 
MODIFY COLUMN unlocked_rewards JSON NOT NULL DEFAULT (JSON_ARRAY());