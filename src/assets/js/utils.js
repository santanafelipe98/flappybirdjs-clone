//Author: Oriol -> https://stackoverflow.com/questions/20590177/merge-two-objects-without-override
function extend (target) {
    for(var i=1; i<arguments.length; ++i) {
      var from = arguments[i];
      if(typeof from !== 'object') continue;
      for(var j in from) {
        if(from.hasOwnProperty(j)) {
          target[j] = typeof from[j]==='object' && !Array.isArray(from[j])
            ? extend({}, target[j], from[j])
            : from[j];
        }
      }
    }
    return target;
}