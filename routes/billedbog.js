var express = require('express');
var router = express.Router();
var User = require('../public/javascripts/user');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');

//Her er det nye

// Mongo URI
const mongoURI = 'mongodb://admin:team12@ds125693.mlab.com:25693/cdi';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI, {useNewUrlParser: true});

// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });


// @route GET /
// @desc Loads form
router.get('/', (req, res, billede) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
     res.render('billedbog', { files: false});
    } else {
      files.map(file  => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png' ||
          file.contentType === 'image/jpg'
        ) {
          file.isImage = true;
          billede = file.filename;        
        } else {
          file.isImage = false;
        }
      });
     res.render('billedbog', {files: files, billede: 'billedbog/image/' +billede});
    }
  });
});

// @route POST /upload
// @desc  Uploads file to DB
router.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/billedbog');
}); 


// Her lagres beskrivelse til billedet i databasen. 
// Det bliver lagret til det specifikke filnavn.
/* Der bliver benyttet en async / await funktion for at
   sørge for koden bliver kørt asynkront. Dette resultere
   i at teksten bliver opdateret når den bliver sat ind
   med det samme.
*/
router.post('/files/:filename', (req, res, next) => {

  // Connect til database
  mongoose.connect('mongodb://admin:team12@ds125693.mlab.com:25693/cdi',{useNewUrlParser: true,}, function(err, db){
  if(err){throw err;}

  // Oprette nyt promise som bliver kørt senere i koden.
    function resolveDetteBagefter() {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(res.redirect('/billedbog'));
        }, 0001);
      });
    }
    // Opretter async funktion 
    async function asyncCall () {
      var result = await resolveDetteBagefter();
    // Peger på database collection 
      var collection = db.collection('uploads.files')
    // Bruger collection.update metoden for at opdatere / give text til specifikt billede
      collection.update(
        { filename: req.params.filename}, 
        { '$set': {'billedDescription': req.body.billedDescription}}  
      )
    }
  asyncCall();
 });
}); 

// @route GET /files
// @desc  Display all files in JSON
router.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
router.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
    
  });
});

// @route GET /image/:filename
// @desc Display Image
router.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/jpg') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res)   
      
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file

router.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/billedbog');
  });
});


//Her slutter det nye

module.exports = router;