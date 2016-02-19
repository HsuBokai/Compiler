
function createNew(prefix, l){
	var issuer = {};
	var id;
	var alphabet = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
	issuer.issue = function(){
		var ret = prefix;
		var num = id;
		var len = l;
		while(len--){
			var r = num%26;
			ret = ret.concat(alphabet[r]);
			num = (num - r)/26;
		}
		id++;
		return ret;
	}
	issuer.reset = function(){ id = 0; }
	issuer.reset();
	return issuer;
}

exports.createNew = createNew;
