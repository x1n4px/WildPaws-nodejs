import jwt from 'jsonwebtoken';
const secretKey = 'libreria2023';


const options = {
    expiresIn: '1h' // El token expirará en 1 hora
};


// jwt.js
function generateToken(id, name) {
    const payload = {
        id: id,
        name: name
    };
    return jwt.sign(payload, secretKey, options);
}

// Middleware para verificar el token en las rutas protegidas
function verifyToken(req, res, next) {
    const token = req.header('Authorization').slice(7);
    if (!token) return res.status(401).send('Token no proporcionado');
    try {
      const decoded = jwt.verify(token, secretKey);
      req.user = decoded; // Agregar el usuario decodificado a la solicitud
      next();
    } catch (error) {
      res.status(403).send('Token inválido');
    }
  }

export { generateToken, verifyToken };
