var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var morgan      = require('morgan');
var index = require('./routes/index');
var users = require('./routes/users');
var mailer = require('express-mailer')
config = require('config')

var port = config.get('ng-mongo.site.port');

var app = express();

// Body Parser MW
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

//morge dev mode set
app.use(morgan('dev'));

// Set Static Folder
app.use(express.static(path.join(__dirname, 'client')));

// set email service enabled
mail_service = require('./services/mailer')(app)



if(config.get('ng-mongo.site.env')=='dev'){
  // error handling for dev mode
  app.use(function(err, req, res, next) {

      console.log(err.status);

      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: err
      });
  });
}

app.use('/', index);
app.use('/api/users', users);

app.listen(port, function(){
  if(config.get('ng-mongo.site.env')=='dev'){
    console.log('Server started on port '+port);
  }
});
