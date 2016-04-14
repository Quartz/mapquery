var d3 = require('d3');
require('d3-geo-projection')(d3);

function getScaleTranslate(data,width,height,proj) {

  var projection = d3.geo[proj]()
    .scale(1)
    .translate([0,0]);

  var path = d3.geo.path()
    .projection(projection);

  var geoBounds = d3.geo.bounds(data);
  var bounds = path.bounds(data), 
    dx = bounds[1][0] - bounds[0][0], 
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    s = .9 / Math.max(dx / width, dy / height),
    t = [width / 2 - s * x, height / 2 - s * y];

  var obj = {geoBounds: geoBounds, bounds: bounds, s: s, t:t};
  
  return obj;
}

module.exports = getScaleTranslate;