var express = require('express')
var fs = require("fs");
var _ = require('lodash')
var Fiber = require("fibers");
db = require('../config/db')
var router = express.Router()

Schema = require('../schema/userSchema')
var Continent = db.model('Continent',Schema.continentSchema)
var Country = db.model('Country',Schema.countriesSchema)


router.get('/',function(req, res, next){
  res.render('index.html')
  return
})


router.get('/insert-continent',function(req, res, next){


fs.readFile('./uploads/continent.json', 'utf8', function (err, data) {

  data = JSON.parse(data);

  Fiber(function () {
    _.each(data, function (document,key) {
      tomodel = {}

      tomodel.code = key
      tomodel.name = document

      var continent_data = new Continent(tomodel)
      continent_data.save();
    });
  }).run();

    return res.json({'status':1,'msg':'continent loaded'})
});
})

router.get('/insert-countries',function(req, res, next){


fs.readFile('./uploads/countries.json', 'utf8', function (err, data) {

  data = JSON.parse(data);
  console.log(data)
  Fiber(function () {
    _.each(data, function (document,key) {


      tomodel = {}
      tomodel.continent_code = document.continent
      tomodel.country_name = document.name

      var country_data = new Country(tomodel)
      country_data.save();
    });
  }).run();

  return res.json({'status':1,'msg':'countries loaded'})
});
})



module.exports = router
