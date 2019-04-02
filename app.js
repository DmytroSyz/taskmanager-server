const express = require("express");
const app = express();
const orm = require('orm');
const bodyParser = require("body-parser");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const jwt = require('jsonwebtoken');


const connectionString = 'database';
let dbVar;
let Todo;
let User;

function generateJWT(email, id, remember) {
    if (remember === true) {
        return jwt.sign({
            email: email,
            id: id,
        }, 'secret', { expiresIn: '5d' });
    } else {
        return jwt.sign({
            email: email,
            id: id,
        }, 'secret', { expiresIn: '1h' });
    }

}

app.use(passport.initialize());
app.use(passport.session());


app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.header('access-control-max-age', 86400);
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since,X-CSRF-Token');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Cache-Control', 'no-cache, must-revalidate');
    res.header('Connection', 'keep-alive');
    next();
});

orm.connect(connectionString, (err, db) => {
    if (err) throw err;
    dbVar = db;
    console.log("DB is connected");
    Todo = dbVar.define('todo', {
        id: String,
        title: String,
        description: String,
        startdate: String,
        finishdate: String,
        priority: String,
        status: Boolean,
        ischecked: Boolean,
        userid: String
    });
    User = dbVar.define('users', {
        id: String,
        email: String,
        pass: String
    });
});

passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'pass'
    },
    function (username, pass, done) {
        User.find({email: username, pass: pass}, (err, user) => {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            return done(null, user);
        });
    }
    )
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.listen(8080);

app.post("/", function(request, response){
    jwt.verify(request.headers.token, 'secret', (err, res) => {
        if (err) {
            return response.sendStatus(403);
        }
        if (res) {
            Todo.find({userid: request.body.userId}, (err, todos) => {
                if (todos) {
                    response.send((formatTodos(todos)));
                } else {
                    response.send(err);
                }
            })
        }
    });
});


app.post('/create', function(request,response){
    if(!request.body) return response.sendStatus(400);
    jwt.verify(request.headers.token, 'secret', (err, res) => {
        if (err) {
            return response.sendStatus(403);
        }
        if (res) {
            Todo.create({
                    id: request.body.todo.id,
                    title: request.body.todo.title,
                    description: request.body.todo.description,
                    startdate: request.body.todo.startDate,
                    finishdate: request.body.todo.finishDate,
                    priority: request.body.todo.priority,
                    status: request.body.todo.status,
                    ischecked: request.body.todo.isChecked,
                    userid: request.body.todo.userId
                },
                (err, success) => {
                    if (success) {
                        response.send(success)
                    } else {
                        response.send(err)
                    }
                })
        }
    });
});

app.post('/delete', function (request, response) {
    if(!request.body) return response.sendStatus(400);
    jwt.verify(request.headers.token, 'secret', (err, res) => {
        if (err) {
            return response.sendStatus(403);
        }
        if (res) {
            Todo.find({id: request.body.deleteId}).remove((err) => {
                console.log(err)
            });
            response.send(['200']);
        }
    });
});

app.post('/edit', function (request, response) {
    if(!request.body) return response.sendStatus(400);
    jwt.verify(request.headers.token, 'secret', (err, res) => {
        if (err) {
            return response.sendStatus(403);
        }
        if (res) {
            Todo.find({id: request.body.editId}, (err, todo) => {
                todo[0].title = request.body.editTask.title;
                todo[0].description = request.body.editTask.description;
                todo[0].startdate = request.body.editTask.startDate;
                todo[0].finishdate = request.body.editTask.finishDate;
                todo[0].priority = request.body.editTask.priority;
                todo[0].status = request.body.editTask.status;
                todo[0].ischecked = request.body.editTask.isChecked;
                todo[0].save((err) => {
                    // console.log(err);
                })
            });
            response.send(['200']);
        }
    });
});

app.post('/status', function (request, response) {
    if(!request.body) return response.sendStatus(400);
    jwt.verify(request.headers.token, 'secret', (err, res) => {
        if (err) {
            return response.sendStatus(403);
        }
        if (res) {
            Todo.find({id: request.body.statusId}, (err, todo) => {
                todo[0].status = request.body.newStatus;
                todo[0].save((err) => {
                    // console.log(err);
                })
            });
            response.send(['200'])
        }
    });
});

app.post('/signup', function (request, response) {
    if(!request.body) return response.sendStatus(400);
    User.find({email: request.body.email}, (err, user) => {
        if (err) {
            response.send(err);
        } else if (user.length >= 1) {
            response.sendStatus(403)
        } else {
            User.create({
                    id: request.body.id,
                    email: request.body.email,
                    pass: request.body.pass
                },
                (err, success) => {
                    console.log(err, success);
                });
            response.send(["ok"])
        }
    })
});

app.post('/login', (req, res, next) => {
    return passport.authenticate('local', {session: false},
        (err, passportUser) => {
            if (passportUser.length < 1) {
                return res.sendStatus(403)
            }
            if (passportUser) {
                let user = passportUser;
                user.token = generateJWT(passportUser.email, passportUser.id, req.body.remember);
                return res.json({token: user.token, id: user[0].id, email: user[0].email});
            }
        })(req, res, next)
});


function formatTodos(todos) {
    return todos.map(function (todo) {
        return {
            id: todo.id,
            title: todo.title,
            description: todo.description,
            startDate: todo.startdate,
            finishDate: todo.finishdate,
            priority: todo.priority,
            status: todo.status,
            isChecked: todo.ischecked,
            userId: todo.userid
        }
    });
}

