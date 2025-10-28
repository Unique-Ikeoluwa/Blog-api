require("dotenv").config();
const http = require("http")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const fs = require("fs").promises


const port = process.env.PORT || 3000

async function readUsers() {
  try {
    const data = await fs.readFile("users.json", "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}


async function readPosts() {
    try {
        const data = await fs.readFile("posts.json", "utf8")
        return JSON.parse(data)
    } catch {
        return[]
    }
}

async function writeUsers(data) {
    await fs.writeFile("users.json", JSON.stringify(data, null, 2))
}

async function writePosts(data) {
    await fs.writeFile("posts.json", JSON.stringify(data, null, 2))
}

function runMiddlewares(req, res, middlewares){
    let index = 0
    function next(){
        const middleware = middlewares[index++]
        if(middleware) middleware(req, res, next)
    }
    next()
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]
    if(!token){
        res.writeHead(401, {"Content-Type": "application/json"})
        return res.end({success: false, message: "Access denied, token required"})
    }
    jwt.verify(token, process.env.JWT_SECRET, (error, user)=> {
        if(error){
            res.writeHead(403, {"Content-Type": "application/json"})
            return res.end({success: false, message: "Invalid or expired token"})
        }
        req.user = user
        next()
    })
}

function authorizeRole(...roles) {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            res.writeHead(401, {"Content-Type": "application/json"})
            return res.end({success: false, message: "Unauthorized"})
        }
        next()
    }
    
}


const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json")
    const url = req.url
    const method = req.method
    try {
        if (url === "/posts" && method === "GET"){
            const posts = await readPosts()
            res.writeHead(200)
            return res.end(JSON.stringify({success: true, data: posts}))
        }

        else if(url === "/register" && method === "POST"){
            const users = await readUsers()
            const newId = users.length ? Math.max(...users.map(user => user.id)) + 1 : 1
            let body = ""
            req.on("data", chunk => (body += chunk))
            req.on("end", async () => {
                const {email, name, password } = JSON.parse(body)
                if (!email || !name || !password){
                    res.writeHead(400)
                    return res.end(JSON.stringify({success: false, message: "All fields are required"}))
                }
                const existingUser = users.find(user => user.email === email)
                if (existingUser){
                    res.writeHead(409)
                    return res.end(JSON.stringify({success: false, message: "User already exist"}))
                }
                const hashedPassword = await bcrypt.hash(password, 10)
                const newUser = {
                    id: newId,
                    role: "user",
                    email,
                    name,
                    hashedPassword
                }
                users.push(newUser)
                await writeUsers(users)
                res.writeHead(201)
                return res.end(JSON.stringify({success: true, message: "User registered successfully", data: newUser}))
            })
            return
        }

        else if (url === "/login" && method === "POST"){
            const users = await readUsers()
            let body = ""
            req.on("data", chunk => (body += chunk))
            req.on("end", async () => {
                const {email, password } = JSON.parse(body)
                if(!email || !password){
                    res.writeHead(400)
                    return res.end(JSON.stringify({success: false, message: "All fields required"}))
                }
                const validUser = users.find(user => user.email === email)
                if (!validUser){
                    res.writeHead(401)
                    return res.end(JSON.stringify({success: false, message: "Invalid credentials"}))
                }
                const validPassword = await bcrypt.compare(password, validUser.hashedpassword)
                if (!validPassword){
                    res.writeHead(401)
                    return res.end(JSON.stringify({success: false, message: "Incorrect password"}))
                }
                const token = jwt.sign(
                    {email},
                    process.env.JWT_SECRET,
                    {expiresIn: "1h"}
                )
                res.writeHead(200)
                return res.end(JSON.stringify({success: true, message: "Login successful", data: token}))
            })
            return
        }

        else if (url.startsWith("/posts/") && method === "GET"){
            const posts = await readPosts()
            const id = parseInt(url.split("/")[2])
            const post = posts.find(p => p.id === id)
            if (!post){
                res.writeHead(404)
                return res.end(JSON.stringify({success: false, message: "No post found"}))
            }
            res.writeHead(200)
            return res.end(JSON.stringify({success: true, data: post}))
        }

        else if (url === "/createpost" && method === "POST"){
            const posts = await readPosts()
            let body = ""
            req.on("data", chunk => (body += chunk))
            req.on("end", async () => {
                const { title, details, author } = JSON.parse(body)
                if (!title || !details || !author ){
                    res.writeHead(400)
                    return res.end(JSON.stringify({success: false, message: "All fields required"}))
                }
                const newPostId = posts.length ? Math.max(...posts.map(post => post.id)) + 1 : 1
                const newPost = {
                    id: newPostId,
                    title,
                    details,
                    author
                }
                posts.push(newPost)
                await writePosts(posts)
                res.writeHead(201)
                return res.end(JSON.stringify({success: true, data: newPost, message: "Post added successfully"}))
            })
            return
        }
        
        else if (url.startsWith("/posts/") && method === "PUT"){
            const posts = await readPosts()
            const id = parseInt(url.split("/")[2])
            let body = ""
            req.on("data", chunk => (body += chunk))
            req.on("end", async () => {
                const { title, details, author } = JSON.parse(body)
                if (!title || !details || !author ){
                    res.writeHead(400)
                    return res.end(JSON.stringify({success: false, message: "All fields required"}))
                }
                const index = posts.findIndex(post => post.id === id)
                if (index === -1 ){
                    res.writeHead(404)
                    return res.end(JSON.stringify({success: false, message: "Post not found"}))
                }
                posts[index] = {...posts[index], title, details, author}
                await writePosts(posts)
                res.writeHead(200)
                return res.end(JSON.stringify({success: true, data: posts[index], message: "Post updated successfully"}))
            })
            return
        }

        else if (url.startsWith("/posts/") && method === "PATCH"){
            const posts = await readPosts()
            const id = parseInt(url.split("/")[2])
            let body = ""
            req.on("data", chunk => (body += chunk))
            req.on("end", async () => {
                const updates = JSON.parse(body)
                if (Object.keys(updates).length === 0) {
                    res.writeHead(400)
                    return res.end(JSON.stringify({ success: false, message: "No fields to update" }))
                    }
                const index = posts.findIndex(post => post.id === id)
                if (index === -1 ){
                    res.writeHead(404)
                    return res.end(JSON.stringify({success: false, message: "Post not found"}))
                }
                posts[index] = {...posts[index], ...updates}
                await writePosts(posts)
                res.writeHead(200)
                return res.end(JSON.stringify({success: true, data: posts[index], message: "Post updated successfully"}))
            })
            return
        }
        
        else if (url.startsWith("/posts/") && method === "DELETE"){
            runMiddlewares(req, res, [
                authenticateToken,
                authorizeRole("admin"),
                async()=> {
                    const posts = await readPosts()
                    const id = parseInt(url.split("/")[2])
                    const newPosts = posts.filter(post => post.id !== id)
                    if (newPosts.length === posts.length){
                        res.writeHead(404)
                        return res.end(JSON.stringify({success: false, message: "Post not found"}))
                    }
                    await writePosts(newPosts)
                    res.writeHead(200)
                    return res.end(JSON.stringify({success: true, message: "Post deleted successfully"}))
                }
            ])
        }

        else if (url === "/profile" && method === "GET"){
            authenticateToken(req, res, () => {
                res.writeHead(200)
                res.end(JSON.stringify({success: true, message: "Access granted", user: req.user}))
            })
        }

        else {
            res.writeHead(404)
            return res.end(JSON.stringify({success: false, message: "Route not found"}))
        }
    } catch (error){
        res.writeHead(500)
        res.end(JSON.stringify({success: false, message: "Server error", error: error.message}))
    }
})
server.listen(port, () => {
    console.log(`Server is running at port ${port}`)
})
