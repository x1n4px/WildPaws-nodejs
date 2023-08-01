import express from 'express'
import {pool} from './db.js'
import port from './config.js'

const app = express()

app.get('/', async (req, res) => {
    const [rows] = await pool.query(`SELECT * FROM users`)
    res.send(rows)
})

app.get('/ping', async (req, res) => {
    const [result] = await pool.query(`SELECT "hello wordl" as RESULT`);
    res.json(result[0]);
})

app.get('/create', async (req, res) => {
    const result = await pool.query(`INSERT INTO users(name) VALUES ("John")`);
    res.json(result);
})
app.listen(port)
console.log('Server on port ', PORT)

