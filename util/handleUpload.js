var AdmZip = require('adm-zip');

module.exports = {
  getExtension: function(filename) {
    return filename.split(".")[filename.split(".").length-1];
  },
  trimExtension: function(filename) {
    return filename.substr(0,filename.length-4);
  },
  addAmpersand: function(region) {
    return (/\band\b/g.test(region)) ? region.replace(/\band\b/,"&") : region;
  },
  getSortedKeys: function(obj) {
    return Object.keys(obj).sort();
  },
  getObjectValues: function(object,keys) {
    var arr = [];
    keys.forEach(function(key){ 
      var str = new String(object[key]).substr(0,15);
      arr.push(str);
    });
    return arr;
  },
  getFolderPath: function(file) {
    return file.destination+file.originalname.substr(0,file.originalname.length-4)+'/';
  },
  extractZip: function(file,callback) {
    if (this.getExtension(req.file.originalname) !== "zip")
      return callback('Sorry, right now you can only upload .zip archives to Mapquery. Please zip your shapefile data and try again.',null);
    
    var s = this;
    var shp = null;
    var dbf = null;
    var filepath = this.getFolderPath(file);
    var zip = new AdmZip(file.destination+file.filename);

    zip.getEntries().forEach(function(zipEntry) {
      if (s.getExtension(zipEntry.entryName) == "shp") shp = zipEntry.entryName;
      if (s.getExtension(zipEntry.entryName) == "dbf") dbf = zipEntry.entryName;
    });

    if (!shp || !dbf) return callback('The zip archive you\'re trying to upload is missing a .shp or .dbf or both.',null);

    zip.extractAllTo(filepath,true);
    callback(null,shp,filepath);
  }
}