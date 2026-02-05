-- users
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    address TEXT,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(6,2),
    age INT,
    sex enum('male', 'female', 'other'),
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
);

-- foods (cache)
CREATE TABLE IF NOT EXISTS foods (
    food_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- servings
CREATE TABLE IF NOT EXISTS servings (
    serving_id VARCHAR(100) PRIMARY KEY,
    food_id VARCHAR(100) NOT NULL,
    description TEXT,
    calories DECIMAL(8,2),
    fat DECIMAL(8,2),
    saturated_fat DECIMAL(8,2),
    mono_fat DECIMAL(8,2),
    poly_fat DECIMAL(8,2),
    carbohydrate DECIMAL(8,2),
    fiber DECIMAL(8,2),
    sugar DECIMAL(8,2),
    protein DECIMAL(8,2),
    cholesterol DECIMAL(8,2),
    sodium DECIMAL(8,2),
    calcium DECIMAL(8,2),
    iron DECIMAL(8,2),
    potassium DECIMAL(8,2),
    vitamin_a_µg DECIMAL(8,2),
    vitamin_c_mg DECIMAL(8,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE,
    INDEX idx_servings_food (food_id)
);

-- meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_plans_user (user_id)
);

-- meal_plan_items
CREATE TABLE IF NOT EXISTS meal_plan_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    serving_id VARCHAR(100) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES meal_plans(plan_id) ON DELETE CASCADE,
    FOREIGN KEY (serving_id) REFERENCES servings(serving_id) ON DELETE RESTRICT,
    CONSTRAINT chk_meal_type CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    INDEX idx_items_plan (plan_id)
);

-- nutrition_targets
CREATE TABLE IF NOT EXISTS nutrition_targets (
    user_id INT PRIMARY KEY,
    daily_calorie_target DECIMAL(8,2),
    daily_protein_target DECIMAL(8,2),
    daily_carbohydrate_target DECIMAL(8,2),
    daily_fat_target DECIMAL(8,2),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- user_favorites
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INT NOT NULL,
    food_id VARCHAR(100) NOT NULL,
    favorited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, food_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE
);
