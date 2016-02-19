
if(process.argv.length < 3){
	throw process.argv[0] + " " + process.argv[1] + " <file.jack>";
}

var tokenAnalyzer = require("./tokenAnalyzer");
var codeGener = require("./codeGener");
var fs = require("fs");
/*
function arr2str(arr, depth){
	var ret = (depth > 0) ? " [\n" : "[\n";
	for(var i=0; i<arr.length; ++i){
		var sep = (i<arr.length-1) ? "," : "";
		for(var j=0; j<depth; ++j) ret = ret.concat(" ");
		if(typeof arr[i] === "object") ret = ret.concat(arr2str(arr[i], depth+1) + sep + "\n");
		else ret = ret.concat("\"" + arr[i] + "\"" + sep + "\n");
	}
	for(var j=0; j<depth; ++j) ret = ret.concat(" ");
	return ret.concat("]");
}
*/

fs.readFile(process.argv[2], 'utf8', function (err, data) {
	if (err) throw err;
	var json = tokenAnalyzer.tokenAnalyze(data);
	fs.writeFile (process.argv[2] + ".vm", codeGener.codegen(json), function(err) {
		if (err) throw err;
		console.log("complete");
	});
});
