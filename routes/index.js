var express = require('express');
var router = express.Router();
var multer  = require('multer');
var upload = multer({dest:'./shapefile-imports/'});

var db = require('../queries');

router.get("/", function(req, res) {
  res.render('index', { 
    title: "Mapquery Search"
  });
});

router.get("/import", function(req, res) {
  res.render('import', { 
    title: "Mapquery Import",
    data: null
  });
});

router.get('/api/feature-collection', db.getFeatureCollection);
router.get('/api/geometry-collection', db.getGeometry);
router.get('/api/table-data', db.getAllTableData);
router.get('/api/units-by-table', db.getTableUnits);

router.post("/import/import-map", upload.single("file-upload"), db.importMapData);
router.post('/import/save-map-data', db.saveMapData);

module.exports = router;