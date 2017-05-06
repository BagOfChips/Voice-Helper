var express = require('express');
var router = express.Router();

/* GET new user creation page. */
router.get('/', function(req, res, next){
    res.render('newUser', {title: 'voil'});
});

module.exports = router;
