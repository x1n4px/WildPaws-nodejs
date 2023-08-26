import express from 'express';
import { pool } from './db.js';
import { PORT } from './config.js';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from './jwt.js';
import cors from 'cors'; // Importa el paquete cors

const app = express();
app.use(cors());

app.use(bodyParser.json());

app.post('/registro', async (req, res) => {
    try {
        const { name, password } = req.body;
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

app.post('/crearProducto', async (req, res) => {
    try {
        const { name, image, price, animal, weigth, food_type, animal_age, animal_size, description, check, Crude_protein, Crude_fat, Crude_fiber, Crude_ash, omega3, omega6, Composition, Aditives } = req.body;

        const query = 'INSERT INTO products ( name, image, price, animal, weigth, food_type, animal_age, animal_size, description, `check`, Crude_protein, Crude_fat, Crude_fiber, Crude_ash, omega3, omega6, Composition, Aditives ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [name, image, price, animal, weigth, food_type, animal_age, animal_size, description, check, Crude_protein, Crude_fat, Crude_fiber, Crude_ash, omega3, omega6, Composition, Aditives];
        const result = pool.query(query, values);
        res.status(201).json(result);

    } catch (error) {
        res.status(500).send('Error en la insercción de un nuevo producto.');
    }
});

app.get('/productos', async (req, res) => {
    try {
        const { animal, food_type } = req.query;
 
        let query = 'SELECT * FROM products p WHERE p.animal = ? AND p.food_type = ?';
        const queryParams = [animal, food_type];

        const [result] = await pool.query(query, queryParams);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al devolver el producto');
    }
});
app.get('/productosReferenciados', async (req, res) => {
    try {
        const { reference } = req.query;
        console.log(reference);
        let query = 'SELECT * FROM products p WHERE p.reference = ?';
        const queryParams = [reference];

        const [result] = await pool.query(query, queryParams);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al devolver el producto');
    }
});

app.get('/ingredientes', async (req, res) => {
    try {
        const [result] = await pool.query(`
        SELECT * from ingredients;`);
        res.json(result);
    } catch {
        res.status(500).send('Error al devolver el producto');
    }
});
app.get('/productos/ingredientes/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const query = `
        SELECT i.name, i.description, i.image, i.amount
        FROM product_ingredients pi
        JOIN ingredients i ON pi.ingredient_id = i.id
        WHERE pi.product_id = ?;
    `;

        const [result] = await pool.query(query, [productId]);

        res.json(result); // Envía la respuesta como JSON
    } catch {
        res.status(500).send('Error al obtener los ingredientes del producto.');
    }
});

app.get('/producto/:id', async (req, res) => {
    try {

        const productId = req.params.id; // Obtiene el ID del producto de los parámetros de la URL

        const productQuery = `
            SELECT p.*
            FROM products p
            WHERE p.id = ?;
        `;

        const [result] = await pool.query(productQuery, [productId]);
         if (result.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const ingredientQuery = `select i.name , i.description , i.image , i.amount  from ingredients i, product_ingredients pi2 
        where pi2.product_id  = ? and pi2.ingredient_id = i.id ;`
        const [ingredientResult] = await pool.query(ingredientQuery, [productId]);
         
        const otherProductQuery = `select p.weigth , p.reference , p.id from products p where p.name = ?; `;
        const [otherProductResult] = await pool.query(otherProductQuery, [result[0].name]);

        const productData = {
            ...result[0],
            ingredients: ingredientResult,
            otherSize: {...otherProductResult},
            cantidad: 0
        }
        for (const key in productData.otherSize) {
            if (key !== 'check' && productData.otherSize.hasOwnProperty(key)) {
                if(productData.otherSize[key].weigth === result[0].weigth){
                    productData.otherSize[key].check = true;
                }else{
                    productData.otherSize[key].check = false;
                }
                
            }
        }
         res.json(productData); // Envía la respuesta como JSON
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los datos del producto.');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;

        const result = await checkUser(name, password);
        const userQuery = 'SELECT * FROM users WHERE name = ?';
         if (result) {
            const [userResult] = await pool.query(userQuery, [name]);
            const token = generateToken(userResult[0].id, userResult[0].name)
            return res.status(200).json(token);
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

