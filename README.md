# 🧩 Node.js HTTP CRUD API (No Express)

A lightweight Node.js RESTful API built **without Express**, using only the native `http` and `fs` modules.  
It demonstrates how to handle **routing, file I/O, and CRUD operations** manually using pure Node.js.

---

## 🚀 Features

- 🧍‍♂️ **User Authentication**
  - Register new users
  - Login with email and password validation

- 📝 **Post Management**
  - Create new posts
  - Read all posts or a specific post by ID
  - Update posts (PUT & PATCH)
  - Delete posts

- 💾 **File-based Storage**
  - All data is stored locally in `users.json` and `posts.json` (no database required)

- ⚡ **Pure Node.js**
  - No frameworks or external dependencies — only the built-in `http` and `fs` modules

---

## 🧠 Learning Objectives

This project helps you understand:
- How the Node.js HTTP module works  
- Handling request and response streams manually  
- Reading and writing JSON files asynchronously  
- Building REST APIs without frameworks  
- Managing routing logic and error handling from scratch  

---

## 📁 Project Structure

📦 http-crud-api

├── users.json

├── posts.json

├── index.js # main server file

└── README.md
