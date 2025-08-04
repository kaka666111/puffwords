# 数据库迁移说明

## 一、结构迁移（Flyway 管理）
所有数据库结构变化请新建文件：

- 文件名格式：`V版本号__描述.sql`
- 示例：`V2__add_reward_table.sql`

放在 `flyway/` 目录中，Flyway 会自动识别并执行。

## 二、插入奖励图（insert_data.sql 管理）
奖励图像数据放在根目录的 `insert_data.sql` 中，每次迁移时自动执行。
请使用 `INSERT IGNORE` 以避免重复插入。

## 三、一键迁移执行方式
运行：

```bash
.\migrate-dev.bat
