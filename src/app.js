import express from 'express';
import { pool } from './db.js';
import { PORT } from './config.js';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from './jwt.js';
const app = express();


app.use(bodyParser.json());

app.post('/registro', async (req, res) => {
    try {
        const { name, password } = req.body;
        console.log(name, password);
        // Cifrar la contraseña
        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hashedPassword) {
                const query = 'INSERT INTO users (name, hashedPassword) VALUES (?, ?)';
                const values = [name, hashedPassword];
                const result = pool.query(query, values);
                res.status(201).json(result);
            });
        });

    } catch (error) {
        res.status(500).send('Error en el registro.');
    }
});

app.get('/login', async (req, res) => {
    try {
        const { name, password } = req.body;

        const result = await checkUser(name, password);
        const userQuery = 'SELECT * FROM users WHERE name = ?';
        console.log(userQuery);
        if (result) {
            const [userResult] = await pool.query(userQuery, [name]);
            const token = generateToken(userResult[0].id, userResult[0].name)
            return res.status(200).json("Incio de sesion correcto JWT: " + token);
        } else {
            return res.status(501).json("Inicio de sesion invalido");
        }



    } catch {
        res.status(500).send('Error en el inicio de sesión.');
    }
});

app.get('/saludo', verifyToken, (req, res) => {
    res.send(`Hola, ${req.user.name}! Has sido autorizado con exito`);
  });
  

async function checkUser(name, password) {
    // Buscar el usuario en la base de datos por su nombre
    const userQuery = 'SELECT * FROM users WHERE name = ?';
    const [userResult] = await pool.query(userQuery, [name]);


    const match = await bcrypt.compare(password, userResult[0].hashedPassword);

    if (match) {
        return true;
    } else {
        false;
    }

    //...
}

app.get('/', async (req, res) => {
    const endpoints = [
        { method: 'GET', path: '/login', description: 'Inicio de sesion con token jwt, necesario: name, password' },
        { method: 'POST', path: '/registro', description: 'Registro de usuario, necesario: name, password' },
        { method: 'GET', path: '/ping', description: 'Devuelve hello world' },
        { method: 'GET', path: '/create', description: 'Inserta un nombre predefinido en la base de datos' },
        { method: 'GET', path: '/saludo', description: 'Devuelve Saludo si tiene token jwt, necesario: token jwt válido' },

      ];
    
      const endpointList = endpoints
        .map(endpoint => `${endpoint.method} ${endpoint.path} - ${endpoint.description}`)
        .join('<br>-');
    
      const message = `Endpoints disponibles:<br>-${endpointList}`;
      res.send(message);
})

app.get('/ping', async (req, res) => {
    const [result] = await pool.query(`SELECT "hello world" as RESULT`);
    res.json(result[0]);
})

app.get('/create', async (req, res) => {
    const result = await pool.query(`INSERT INTO users(name) VALUES ("John")`);
    res.json(result);
})
app.listen(PORT)
console.log('Server on port ', PORT)

