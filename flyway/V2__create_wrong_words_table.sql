-- Flyway migration V2 to create wrong_words table

-- 错词本表
CREATE TABLE wrong_words (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    word VARCHAR(255) NOT NULL COMMENT '错误的单词',
    meaning VARCHAR(255) NOT NULL COMMENT '单词的中文含义',
    mode VARCHAR(50) NOT NULL COMMENT '游戏模式',
    error_count INT DEFAULT 1 COMMENT '错误次数',
    last_error_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_player_word (player_id, word)
);

-- 添加索引优化查询
CREATE INDEX idx_player_word ON wrong_words(player_id, word);