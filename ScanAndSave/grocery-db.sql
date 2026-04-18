-- ----------------------------------------------------
--  SQL script to create tables in the grocery database
-- ----------------------------------------------------

DROP DATABASE IF EXISTS grocery-db;

CREATE DATABASE grocery-db
USE grocery-db;

-- Owner of receipts and inventory
CREATE TABLE user
(
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(32) NOT NULL,
    password VARCHAR(255) NOT NULL,            /* To store Salted and Hashed Password Parts */
    first_name VARCHAR(32) NOT NULL,
    middle_name VARCHAR(32),
    last_name VARCHAR(32) NOT NULL,
    city VARCHAR(64) NOT NULL,
    state_name VARCHAR(32) NOT NULL,
    zipcode VARCHAR(5) NOT NULL,              /* e.g., 24060 */
    email VARCHAR(128) NOT NULL,
    cell_phone_number VARCHAR(24),
    PRIMARY KEY (id)
);

-- 
CREATE TABLE product (
    id CHAR(36) PRIMARY KEY,
    normalized_name VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    typical_shelf_life_days INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contains multiple receipt items
CREATE TABLE receipt (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    merchant VARCHAR(255),      /*Store name*/
    purchase_date DATE,
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Belongs to a receipt which belongs to a user
-- May reference a product
CREATE TABLE receipt_item (
    id CHAR(36) PRIMARY KEY,
    receipt_id CHAR(36),
    product_id CHAR(36),
    raw_name TEXT,
    normalized_name VARCHAR(255),
    category VARCHAR(100),
    price DECIMAL(10,2),
    quantity DECIMAL(10,2) DEFAULT 1,
    estimated_expiration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (receipt_id) 
        REFERENCES receipts(id) 
        ON DELETE CASCADE,

    FOREIGN KEY (product_id) 
        REFERENCES products(id)
);

-- Grocery from the current inventory which belongs to a user
-- May reference a product
CREATE TABLE inventory_item (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    product_id CHAR(36),
    normalized_name VARCHAR(255),
    category VARCHAR(100),
    quantity DECIMAL(10,2),
    estimated_expiration_date DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    FOREIGN KEY (product_id) 
        REFERENCES products(id)
);