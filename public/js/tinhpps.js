function bin2string(array) {
    var result = "";
    for (var i = 0; i < array.length; ++i) {
        result += (String.fromCharCode(array[i]));
    }
    return result;
}

function arrayToPSS(array){
    var str=bin2string(array)
    return btoa(str)
}
var array=[]
arrayToPSS(array)
