var express = require('express')
var router = express.Router()
var mongojs = require('mongojs')
db = require('../config/db');
upload = require('../services/multer-s3')

var crypto = require('crypto')
jwt = require('jsonwebtoken')
superSecret = 'b1N3xXrpwNPrsLZH2GmCa95TbuU6hvvKQYVDcKSKrg4PfiOCm_X8A5G_hpLvTmD_'




// get all tasks
router.get('/tasks', function(req, res, next) {
  db.tasks.find(function(err, results) {
    if (err) {
      res.send(err)
    }
    res.json(results)
    return
  })
  return
})


// get single tasks
router.get('/task/:id', function(req, res, next) {
  db.tasks.findOne({
    _id: mongojs.ObjectId(req.params.id)
  }, function(err, result) {
    if (err) {
      res.send(err)
    }
    res.json(result)
  })
  return
})

//Save Task
router.post('/task', function(req, res, next) {
  var task = req.body;

  if (!task.title || !(task.isDone + '')) {
    res.status(400);
    res.json({
      "error": "Bad Data"
    });
  } else {
    db.tasks.save(task, function(err, task) {
      if (err) {
        res.send(err);
      }
      res.json(task);
    });
  }
});


// delete task
router.delete('/task/:id', function(req, res, next) {
  db.tasks.remove({
    _id: mongojs.ObjectId(req.params.id)
  }, function(err, result) {
    if (err) {
      res.send(err)
    }
    res.json(result)
  })
  return
})

// update task

router.put('/task/:id', function(req, res, next) {

  var task = req.body
  var updTask = {}

  if (task.isDone) {
    updTask.isDone = task.isDone
  }

  if (task.title) {
    updTask.title = task.title
  }

  if (!updTask) {
    res.status(400).json({
      'error': 'bad data'
    })
  }

  db.tasks.update({
    _id: mongojs.ObjectId(req.params.id)
  }, updTask, {}, function(err, result) {
    if (err) {
      res.send(err)
    }
    res.json(result)
  })
  return
})

// get users
router.get('/users/', function(req, res, next) {
  db.users.find(function(err, results) {
    if (err) {
      res.send(err)
    }
    res.json(results)
  })
  return
})


router.post('/register', function(req, res, next) {
  var tomodel = {};
  if (!req.body.email || !req.body.password || !req.body.username) {
    res.status(400);
    res.json({
      "error": "Bad Data"
    });

  } else {

    tomodel.email = req.body.email
    tomodel.password = crypto.createHash("md5")
      .update(req.body.password)
      .digest('hex');
    tomodel.username = req.body.username
    tomodel.token = createToken(req.body.email)

    db.users.save(tomodel, function(err, tomdel) {
      if (err) {
        res.send(err);
      }
      res.json(tomdel);
    });
  }
})


router.post('/login', function(req, res, next) {
  // check if user exist

  var tomodel = {};
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.json({
      "error": "Bad Data"
    });

  } else {

    pwd = crypto.createHash("md5")
      .update(req.body.password)
      .digest('hex');

    db1.users.findOne({
      email: req.body.email,
      password: pwd
    }).then(function(result) {

      var updTask = {}
      result.token = createToken(req.body.email)
      console.log(result, result.token)

      return db1.users.findOneAndUpdate({
        _id: result._id
      }, result, {
        multi: false
      })

    }).then(function(updRes) {
      res.json(updRes)
    }).catch(function(err) {
      console.log(err)
      res.send(err)
    })


    /**
     * @deprecated code start
     */

    // db.users.findOne({
    //   email: req.body.email,
    //   password: pwd
    // }, function(err, result) {
    //
    //
    //   if (err) {
    //     res.send(err)
    //   }
    //
    //   if(result ==null){
    //     res.status(400)
    //     res.json({"error":"email or password is mismatch"});
    //     return
    //   }
    //
    //   // update token
    //   token = createToken(req.body.email)
    //
    //
    //   res.json(result)
    //
    // })

    /**
     * @deprecated code end
     */
    return

  }

})


router.get('/user_profile/:id', function(req, res, next) {
  if (!req.params.id) {

    res.status(400).json({
      'status': 0,
      "msg": "Bad Data"
    });
    return
  }

  db.users.findOne({
    _id: mongojs.ObjectId(req.params.id)
  }, function(err, result) {
    if (err) {
      res.status(500).json({
        'status': 0,
        "msg": "problam in fetch User"
      });
      return
    }

    res.status(200).json({
      'status': 0,
      'msg': 'User fetched',
      'data': result
    })

  })

  return
})


router.post('/user_profile',upload.array('photos', 14) ,function(req, res, next) {
  
})


router.post('/upload', upload.array('photos', 3), function(req, res, next) {
  res.send('Successfully uploaded ' + req.files.length + ' files!')
})


createToken = function(id) {

  var exp_time = Math.floor(Date.now() / 1000) + (3600 * 3600);
  var token = jwt.sign({
    exp: exp_time,
    data: Math.floor((Math.random() * 1000000000) + 1).toString()
  }, superSecret);
  return token;

}

requireAuthentication = function(token) {
  // check header or url parameters or post parameters for token

  var superSecret1 = 'b1N3xXrpwNPrsLZH2GmCa95TbuU6hvvKQYVDcKSKrg4PfiOCm_X8A5G_hpLvTmD_';
  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, superSecret1, function(err, decoded) {
      if (err) {
        return null
      }
      return decoded
    });

  }
  return null
}




module.exports = router
