'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var cors = require('cors');

const dns = require('dns')

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyparser = require("body-parser")
app.use(bodyparser.urlencoded({extended:false}))
app.use(bodyparser.json())

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


//My code
mongoose.connect(process.env.MONGODB_URL, {useNewUrlParser:true})

const cnn = mongoose.connection
cnn.on('error', console.error.bind(console, 'connection error:'))

cnn.once('open', ()=>{
  
  const shortUrlSchema = new mongoose.Schema({
    originalUrl: String,
    shortUrl: Number
  })
  
  const shortUrl = mongoose.model('shortUrl', shortUrlSchema)
  
  const countUrls = (done)=>{
    shortUrl.countDocuments({}, (err, count)=>{
      if (err) done(err)
      done(null, count)
    })
  }
  
  const findUrl = (url,done)=>{
    shortUrl.findOne(url, (err, url)=>{
      if (err) done(err)
      done(null, url)
    })
  }
  

  
  app.post("/api/shorturl/new", (req, res, next)=>{
    const origUrl = req.body.url
    dns.lookup(origUrl.replace(/https?:\/\//, ""), (err, addresses, fam )=>{
      if (err) res.send({"error": "invalid URL"})
    })
    countUrls((err, count)=>{
      if (err) throw err
      if (count) {
        findUrl({originalUrl:origUrl}, (err, url)=>{
          if (err) throw err
          
          if (url) res.json({originalUrl: origUrl, shortUrl: url.shortUrl})
          else {
            let newUrl = new shortUrl({originalUrl: origUrl, shortUrl: count+1})
            newUrl.save((err, url)=>{
              if (err) throw err
              res.json({originalUrl: origUrl, shortUrl: url.shortUrl})
            })
          }
        })
      }
      else {
        let newUrl = new shortUrl({originalUrl: origUrl, shortUrl: 1})
        newUrl.save((err, url)=>{
          if (err) throw err
          res.json({originalUrl: origUrl, shortUrl: 1})
        })
        
        
      }
    })
    
  })
  
  app.get("/api/shorturl/:n", (req, res)=>{
    if (isNaN(req.params.n)) res.send("Invalid shortlink")
    shortUrl.findOne({shortUrl: req.params.n}, (err, url)=>{      
      if (err) throw err
      if (url) {
        const redirect = /^https?/.test(url.originalUrl)?url.originalUrl: `//${url.originalUrl}`
        res.redirect(redirect)
      }
      else res.json({error: 'not found'})
    })
  })
  
})


//============

app.listen(port, function () {
  console.log('Node.js listening ...');
});