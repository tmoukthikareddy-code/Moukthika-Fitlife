
CREATE DATABASE IF NOT EXISTS moukthika_fitlife;
USE moukthika_fitlife;

CREATE TABLE members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(20),
    date_of_birth DATE,
    joined_on DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE membership (
    membership_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(60) NOT NULL UNIQUE,
    duration_months INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE subscription (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    membership_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status ENUM('Paid','Pending','Partial')
        NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (member_id)
        REFERENCES members(member_id) ON DELETE CASCADE,
    FOREIGN KEY (membership_id)
        REFERENCES membership(membership_id)
);

INSERT INTO membership
(plan_name, duration_months, price, description)
VALUES
('Monthly Fit', 1, 999, 'One month gym membership'),
('Quarterly Strength', 3, 2699, 'Three month membership'),
('Half-Year Power', 6, 4999, 'Six month membership'),
('Annual Transformation', 12, 8999, 'Twelve month membership');
