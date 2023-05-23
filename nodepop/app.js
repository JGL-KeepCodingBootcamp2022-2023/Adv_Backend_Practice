var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const i18n = require('./lib/i18nConfigure');
const LoginController = require('./controllers/LoginController');
const jwtAuthMiddleware = require('./lib/jwtAuthMiddleware');
const { Requester } = require('cote');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

require('dotenv').config();
require('./lib/connectMongoose');

var app = express();

//AÑADIR MICROSERVICO PARA CAMBIAR EL TAMAÑO DE LAS FOTOS CON JIMP

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

app.locals.title = 'NodePop';

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const loginController = new LoginController();

/**
 * API routes
 */
app.use('/api/anuncios', jwtAuthMiddleware, require('./routes/api/anuncios')); //Protecting endpoint with jwtAuthMiddleware
app.post('/api/authenticate', loginController.postAPI);
app.post('/profile', upload.single('foto'), function (req, res, next) {
    // req.file es el archivo del `avatar`
    // req.body contendrá los campos de texto, si los hubiera.
    
    //Llamar al microservico
    const requester = new Requester({ name: 'nodepop' });
    
    //Evento de petición de thumbnail.
    const event = {
        type: 'Thumbnail conversion',
        name: 'Thumbnail conversion',
        buffer: req.file.buffer,
    };
    
    requester.send(event, (resultado) => {
        console.log(Date.now(), 'nodepop obtiene resultado: ', resultado);
    });
    
    upload(req, res, function (err) {
        if (err) {
            createError(2, __('An error occurred during the upload.'));
        }
    });
});



app.use(i18n.init);
/**
 * Website routes
 */
app.use('/', require('./routes/api/anuncios'));
app.use('/users', require('./routes/users'));
app.use('/change-locale', require('./routes/change-locale'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500);

    //If it's an API request that failed, I return the error in JSON format

    if (req.originalUrl.startsWith('/api/')) {
        res.json({ error: err.message });
        return;
    }

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.render('error');
});

module.exports = app;
