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
        const { email, password, name, surname, birthday } = req.body;
         bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, function (err, hashedPassword) {
                const query = 'INSERT INTO users (email, hashedPassword, Name, Surname, birthday) VALUES (?,?,?,?,?)';
                const values = [email, hashedPassword, name, surname, birthday];
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
        const { animal, food_type, pagina, resultadosXPagina } = req.query;

        // Convertir las cadenas en números enteros
        const startIndex = parseInt((pagina - 1) * resultadosXPagina);
        const limit = parseInt(resultadosXPagina);

        // Consulta SQL con limitaciones
        let query = 'SELECT * FROM products p WHERE p.animal = ? AND p.food_type = ? LIMIT ?, ?';
        const queryParams = [animal, food_type, startIndex, limit];

        const [result] = await pool.query(query, queryParams);

        let lengthQuery = 'select count(*) longitud from products p WHERE p.animal = ? AND p.food_type = ?';
        const lengthParams = [animal, food_type];
        const [lengthResult] = await pool.query(lengthQuery, lengthParams);
         const resultado = {
            longitud_Total: lengthResult[0].longitud,
            data: result
        }

        res.json(resultado);
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

app.get('/busqueda', async (req, res) => {
    try {
        const { busqueda } = req.query;
         let query = 'SELECT * FROM products p WHERE upper(p.name) LIKE upper(?)';
         const likePattern = `%${busqueda}%`; 
        const queryParams = [likePattern];
         
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


app.post('/productos/similar', async (req, res) => {
    try {
        const { productId, datosPedidos, numero_pagina, datos_pagina } = req.body;
        console.log(productId, datosPedidos, numero_pagina, datos_pagina);
        const query = `
            SELECT t.nombre
            FROM Tags t
            JOIN Producto_Tag pt ON pt.tag_id = t.tag_id
            WHERE pt.producto_id = ?;
        `;

        const [tagsResult] = await pool.query(query, [productId]);

        const animal = tagsResult.some(tag => tag.nombre === 'DOG') ? 'Perro' : 'Gato';

        const tagQuery = `
            SELECT DISTINCT p.*
            FROM products p
            WHERE p.id IN (
                SELECT pt.producto_id
                FROM Producto_Tag pt
                JOIN Tags t ON pt.tag_id = t.tag_id
                WHERE t.nombre IN (${tagsResult.map(tag => `'${tag.nombre}'`).join(', ')})
            ) AND p.animal = ?;
        `;

        const [tagResult] = await pool.query(tagQuery, animal);

        let datosReducidos = tagResult.map(producto => ({
            name: producto.name,
            price: producto.price,
            image: producto.image,
            reference: producto.reference,
            id: producto.id
        }));

        if (tagResult.length > datosPedidos) {
            const resultadosAleatorios = [];

            while (resultadosAleatorios.length < datosPedidos) {
                const indiceAleatorio = Math.floor(Math.random() * tagResult.length);
                resultadosAleatorios.push(tagResult.splice(indiceAleatorio, 1)[0]);
            }

            datosReducidos = resultadosAleatorios;
        }

        const salida = {
            resultadosTotales: datosReducidos.length,
            resultadosDevueltos: datosPedidos,
            datos: datosReducidos
        };

        res.json(salida);
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

        const ingredientQuery = `select i.name , i.description , i.image  from ingredients i, product_ingredients pi2 
        where pi2.product_id  = ? and pi2.ingredient_id = i.id ;`
        const [ingredientResult] = await pool.query(ingredientQuery, [productId]);
        console.log(ingredientResult);
        const otherProductQuery = `select p.weigth , p.reference , p.id from products p where p.name = ?; `;
        const [otherProductResult] = await pool.query(otherProductQuery, [result[0].name]);

        const productData = {
            ...result[0],
            ingredients: ingredientResult,
            otherSize: { ...otherProductResult },
            cantidad: 0
        }
        for (const key in productData.otherSize) {
            if (key !== 'check' && productData.otherSize.hasOwnProperty(key)) {
                if (productData.otherSize[key].weigth === result[0].weigth) {
                    productData.otherSize[key].check = true;
                } else {
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
        const { email, password } = req.body;

        const result = await checkUser(email, password);
        const userQuery = 'SELECT * FROM users WHERE email = ?';
        if (result) {
            const [userResult] = await pool.query(userQuery, [email]);
            const token = generateToken(userResult[0].id, userResult[0].email);

            const AddressQuery = 'select * from Addresses a WHERE a.id_user = ?';
            const [AddressResult] = await pool.query(AddressQuery, [userResult[0].id]);

            const CardQuery = 'select * from CardDetails cd where cd.user_id = ?';
            const [CardResult] = await pool.query(CardQuery, [userResult[0].id]);

            const userData = {
                token: token,
                user: {
                    id: userResult[0].id,
                    email: userResult[0].email,
                    name: userResult[0].Name,
                    surname: userResult[0].Surname,
                    birthday: userResult[0].birthdate,
                    address: AddressResult,
                    card: CardResult
                }

            }


            return res.status(200).json(userData);
        } else {
            return res.status(501).json("Inicio de sesion invalido");
        }



    } catch {
        res.status(500).send('Error en el inicio de sesión.');
    }
});

app.post('/changeAddressFav', async (req, res) => {
    try {
        const { index, user_id } = req.body;
        const ChangeQuery = 'UPDATE Addresses a set a.primary = 0 where a.id_user = ?';

        const [AddressResult] = await pool.query(ChangeQuery, user_id);

        const Change2Query = 'UPDATE Addresses a set a.primary = 1 where a.id = ? and a.id_user = ?';
        const queryParams = [index, user_id];
        const [Address2Result] = await pool.query(Change2Query, queryParams);

        const resolverInfo = 'SELECT * from Addresses a where a.id_user  = ?';
        const [resolverQuery] = await pool.query(resolverInfo, user_id);

        res.status(201).json(resolverQuery);

    } catch (error) {
        res.status(500).send('Error en la modificación de las direcciones');
    }
});

app.get('/saludo', verifyToken, (req, res) => {
    res.send(`Hola, ${req.user.name}! Has sido autorizado con exito`);
});


async function checkUser(email, password) {
    // Buscar el usuario en la base de datos por su nombre
    const userQuery = 'SELECT * FROM users WHERE email = ?';
    const [userResult] = await pool.query(userQuery, [email]);


    const match = await bcrypt.compare(password, userResult[0].hashedPassword);

    if (match) {
        return true;
    } else {
        false;
    }

    //...
}


app.get("/start", async (req, res) => {
    const userQuery = `CREATE TABLE TuTabla (
        id VARCHAR(255),
        email VARCHAR(255),
        hashedPassword VARCHAR(255),
        name VARCHAR(255),
        surname VARCHAR(255),
        birthday VARCHAR(255)
    );
    `;
    const [userResult] = await pool.query(userQuery);
})


app.get('/', async (req, res) => {
    const endpoints = [
        { method: 'GET', path: '/login', description: 'Inicio de sesion con token jwt, necesario: name, password' },
        { method: 'POST', path: '/registro', description: 'Registro de usuario, necesario: name, password' },
         { method: 'POST', path: '/crearProducto', description: 'Crea un producto dado los siguientes campos: name, image, price, animal, weigth, food_type, animal_age, animal_size, description, check, Crude_protein, Crude_fat, Crude_fiber, Crude_ash, omega3, omega6, Composition, Aditives' },
        { method: 'GET', path: '/producto/:id', description: 'Devuelve el producto dado su ID' },
        { method: 'GET', path: '/productos/ingredientes/:id', description: 'Devuelve los ingredientes dado su ID' },
        { method: 'GET', path: '/ingredientes', description: 'Devuelve todos los ingredientes' },
        { method: 'GET', path: '/productosReferenciados', description: 'Devuelve el producto dado su referencia' }




    ];

    const endpointList = endpoints
        .map(endpoint => `${endpoint.method} ${endpoint.path} - ${endpoint.description}`)
        .join('<br>-');

    const message = `Endpoints disponibles:<br>-${endpointList}`;
    res.send(message);
})

 
 
app.listen(PORT)
console.log('Server on port ', PORT)

