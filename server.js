const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt = require("jsonwebtoken");
const server = jsonServer.create();
const router = jsonServer.router("./database.json");
const userdb = JSON.parse(fs.readFileSync("./users.json", "UTF-8"));
const middlewares = jsonServer.defaults();

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
// server.use(jsonServer.defaults());
server.use(middlewares);

const SECRET_KEY = "123456789";
const expiresIn = "24h";

const admin_key = "123456789";
const expiresAdminIn = "1h";

// Create a token from a payload
function createToken(payload) {
    return jwt.sign(payload, admin_key, { expiresIn });
}
function createTokenAdmin(payload) {
    return jwt.sign(payload, SECRET_KEY_ADMIN, { expiresAdminIn });
}
// Verify the token
function verifyToken(token) {
    return jwt.verify(token, SECRET_KEY, (err, decode) => (decode !== undefined ? decode : err));
}
// Check if the user exists in database
function isAuthenticated({ email, password }) {
    return (
        userdb.users.findIndex((user) => user.email === email && user.password === password) !== -1
    );
}
function isAuthenticatedAdmin({ input, areaToken }) {
    const uid = parseInt(input, 10);
    const aid = parseInt(areaToken, 10);
    return userdb.admins.findIndex((a) => a.id === uid && a.area_id === aid) !== -1;
}
function getIdUser({ email, password }) {
    return userdb.users.findIndex((user) => user.email === email && user.password === password);
}
//token verification
server.post("/auth/token", (req, res) => {
    const { token } = req.body;
    if (verifyToken(token) instanceof Error) {
        const status = 401;
        const message = "Access token not provided";
        res.status(status).json({ status, message });
        return;
    }
    const status = 200;
    const message = "Token Pass";
    res.status(status).json({ status, message });
    return;
});
//token admin verification
server.post("/auth/tokenAdmin", (req, res) => {
    const { token } = req.body;
    if (verifyToken(token) instanceof Error) {
        const status = 401;
        const message = "Access token not provided";
        res.status(status).json({ status, message });
        return;
    }
    const status = 200;
    const message = "Token Pass";
    res.status(status).json({ status, message });
    return;
});
// add checkin to database.json
server.put("/checkin", (req, res) => {
    const { id_user } = req.body;
    let idxUser = parseInt(id_user); // id del usuario parseada
    fs.readFile("./database.json", (err, data) => {
        // err = error, data = contenido del archivo
        if (err) {
            const status = 500;
            const message = "Internal server error";
            res.status(status).json({ status, message });
            return;
        }
        // parsear el archivo
        var data = JSON.parse(data.toString());
        var date = new Date();
        var today = `${date.getDay()}/${date.getMonth()}/${date.getFullYear()}`;
        // buscar el usuario
        var idToUpdate = data.checkin.findIndex((a) => a.user_id === idxUser && a.date === today);
        if (idToUpdate !== -1) {
            if (data.checkin[idToUpdate].status === 4) {
                const status = 203;
                const message = "Ya finalizaste el día";
                res.status(status).json({ status, message });
            }
            if (data.checkin[idToUpdate].status === 3) {
                data.checkin[idToUpdate].time_out = `${date.getHours()}:${date.getMinutes()}`;
                data.checkin[idToUpdate].status = 4;
                const status = 200;
                const message = "Dia terminado";
                res.status(status).json({ status, message });
            }
            if (data.checkin[idToUpdate].status === 2) {
                data.checkin[idToUpdate].lunch_out = `${date.getHours()}:${date.getMinutes()}`;
                data.checkin[idToUpdate].status = 3;
                const status = 200;
                const message = "Entreda Almuerzo";
                res.status(status).json({ status, message });
            }
            if (data.checkin[idToUpdate].status === 1) {
                data.checkin[idToUpdate].lunch_in = `${date.getHours()}:${date.getMinutes()}`;
                data.checkin[idToUpdate].status = 2;
                const status = 200;
                const message = "Salida Almuerzo";
                res.status(status).json({ status, message });
            }
        }
        if (idToUpdate === -1) {
            data.checkin.push({
                id: data.checkin.length + 1,
                user_id: idxUser,
                date: today,
                time_in: `${date.getHours()}:${date.getMinutes()}`,
                time_out: "",
                lunch_in: "",
                lunch_out: "",
                extra_time: "",
                status: 1,
            });
            const status = 200;
            const message = "Entrada";
            res.status(status).json({ status, message });
        }
        var writeData = fs.writeFile("database.json", JSON.stringify(data), (err, result) => {
            if (err) {
                const status = 400;
                const message = "Ocurrio un error";
                res.status(status).json({ status, message });
                return;
            }
            const status = 200;
            const message = "Bienvenido!!!";
            res.status(status).json({ status, message });
            return;
        });
    });
});
// Register New User
server.post("/auth/register", (req, res) => {
    console.log("register endpoint called; request body:");
    console.log(req.body);
    const { email, password } = req.body;
    if (isAuthenticated({ email, password }) === true) {
        const status = 401;
        const message = "Email and Password already exist";
        res.status(status).json({ status, message });
        return;
    }
    fs.readFile("./users.json", (err, data) => {
        if (err) {
            const status = 401;
            const message = err;
            res.status(status).json({ status, message });
            return;
        }
        // Get current users data
        var data = JSON.parse(data.toString());
        // Get the id of last user
        var last_item_id = data.users[data.users.length - 1].id;
        //Add new user
        data.users.push({ id: last_item_id + 1, email: email, password: password }); //add some data
        var writeData = fs.writeFile("./users.json", JSON.stringify(data), (err, result) => {
            // WRITE
            if (err) {
                const status = 401;
                const message = err;
                res.status(status).json({ status, message });
                return;
            }
            const status = 100;
            const message = "User created";
            res.status(status).json({ status, message });
            return;
        });
    });
    // Create token for new user
    const access_token = createToken({ email, password });
    console.log("Access Token:" + access_token);
    res.status(200).json({ access_token });
});
// Login to one of the users from ./users.json
server.post("/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (isAuthenticated({ email, password }) === false) {
        const status = 401;
        const message = "Incorrect email or password";
        res.status(status).json({ status, message });
        return;
    }
    const uid = getIdUser({ email, password });
    const access_token = createToken({ email, uid });
    console.log("Access Token:" + access_token);
    const status = 200;
    res.status(status).json({ status, access_token });
});
// Login admins
server.post("/auth/loginadmin", (req, res) => {
    let { input, areaToken } = req.body;
    input = parseInt(input, 10);
    areaToken = parseInt(areaToken, 10);
    if (isAuthenticatedAdmin({ input, areaToken }) === false) {
        const status = 401;
        const message = "Id administrador incorrecto";
        res.status(status).json({ status, message });
        return;
    }
    const status = 200;
    const access_token = createToken({ id: input, area: areaToken });
    const message = "Bienvenido";
    res.status(status).json({ status, access_token, message });
});
// check if user is authenticated an do som fetch
server.use(/^(?!\/auth).*$/, (req, res, next) => {
    if (
        req.headers.authorization === undefined ||
        req.headers.authorization.split(" ")[0] !== "Bearer"
    ) {
        const status = 401;
        const message = "Error in authorization format";
        res.status(status).json({ status, message });
        return;
    }
    try {
        let verifyTokenResult;
        verifyTokenResult = verifyToken(req.headers.authorization.split(" ")[1]);

        if (verifyTokenResult instanceof Error) {
            const status = 401;
            const message = "Access token not provided";
            res.status(status).json({ status, message });
            return;
        }
        next();
    } catch (err) {
        const status = 401;
        const message = "Error access_token is revoked";
        res.status(status).json({ status, message });
    }
});

server.use(router);

server.listen(8000, () => {
    console.log("Run Auth API Server");
});
