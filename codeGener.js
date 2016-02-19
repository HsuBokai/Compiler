
var IdIssuer = require("./IdIssuer");

var isError = false;
function check(type, value){
	if(value!=type) {
		console.log("expect " + type + " but " + value);
		isError = true;
		return false;
	}
	return true;
}
function ascii(c){ return c.charCodeAt(0); }

var SymbolTable = {
createNew: function(){
		   var st = {};
		   st.length = 0;
		   var table = {};
		   var numberIssuer = {};
		   function getNumber(kind){
		   	var temp = numberIssuer[kind];
		   	numberIssuer[kind] = (temp===undefined) ? 0 : temp+1; 
		   	return numberIssuer[kind];
		   }
		   st.push = function(json){
		   	if(json[0] != "classVarDec" && json[0] != "varDec") return;
			var kind = json[1];
			var type = json[2];
			for(var i=3; i<json.length; i=i+2){
				table[json[i]] = [kind, type, getNumber(kind)];
				if(kind=="field" || kind=="var") st.length++;
			}
			//console.log(table);
		   }
		   st.pushArgs = function(json){
		   	if(json[0] != "parameterList") return;
			var kind = "argument";
			for(var i=1; i<json.length; i=i+3){
				table[json[i+1]] = [kind, json[i], getNumber(kind)];
			}
			//console.log(table);
		   }
		   st.get = function(key){ return table[key]; }
		   return st;
	   }
}

var Output = {
createNew: function(){
	var output = {};
	var outText;
	output.pushln = function(command){ outText = outText.concat(command, "\n");}
	output.push = function(command){ outText = outText.concat(command); }
	output.getOutText = function(){ return outText; }
	output.reset = function(){ outText = "";}
	output.reset();
	return output;
}
}


var Subroutine = {
createNew: function(output, className, class_sym_table){
	var subroutine = {};
	var method_sym_table = SymbolTable.createNew();
	var idIssuer;
	var isArgPlus1 = 0;
	function subroutineCall_(json){
		if(json[2]=="."){
			var temp = method_sym_table.get(json[1]);
			if(temp===undefined) temp = class_sym_table.get(json[1]);
			var subroutineClass = (temp===undefined) ? json[1] : temp[1];
			if(!check("(", json[4])) return;
			var last = json.length-1;
			var argNum = 0;
			if(temp!=undefined) {
				output.pushln("push " + varName_(json[1]));
				++argNum;
			}
			for(var i=5; i<last; ++i){
				if(check("expression", json[i][0])) {
					expression_(json[i]);
					if(json[i][1].length > 1) ++argNum;
				}
			}
			if(!check(")", json[last])) return;
			if(check("subroutineName", json[3][0])) output.pushln("call " + subroutineClass + "." + json[3][1] + " " + argNum);

		}
		else{
			if(!check("(", json[2])) return;
			output.pushln("push pointer 0");
			var last = json.length-1;
			var argNum = 1;
			for(var i=3; i<last; ++i){
				if(check("expression", json[i][0])) {
					expression_(json[i]);
					if(json[i][1].length > 1) ++argNum;
				}
			}
			if(!check(")", json[last])) return;
			if(check("subroutineName", json[1][0])) output.pushln("call " + className + "." + json[1][1] + " " + argNum);
		}
	}
	function keywordConstant_(json){
		switch(json[1]){
			case "true": 
				output.pushln("push constant 0");
				output.pushln("not"); break;
			case "false": output.pushln("push constant 0"); break;
			case "null": output.pushln("push constant 0"); break;
			case "this": output.pushln("push pointer 0"); break;
		}
	}
	function stringConstant_(json){
		//console.log(json);
		var str = json[1];
		var len = str.length;
		output.pushln("push constant " + len);
		output.pushln("call String.new 1");
		for(var i=0; i<len; ++i){
			output.pushln("push constant " + ascii(str.charAt(i)));
			output.pushln("call String.appendChar 2");
		}
	}
	function varName_(varName){
		var temp = method_sym_table.get(varName);
		if(temp===undefined) temp = class_sym_table.get(varName);
		if(temp===undefined){
			console.log("expect varName but \"" + varName + "\"");
			isError = true;
			return "";
		}
		switch(temp[0]){
			case "static": return "static " + temp[2];
			case "field": return "this " + temp[2];
			case "argument": return "argument " + (temp[2]+isArgPlus1);
			case "var": return "local " + temp[2];
			default: consoel.log("expect var kind but \"" + temp[0] + "\""); isError = true; return"";
		}
	}
	function op_(json){
		if(json.length==1) return; 
		switch(json[1]){
			case "+": output.pushln("add"); break;
			case "-": output.pushln("sub"); break;
			case "*": output.pushln("call Math.multiply 2"); break;
			case "/": output.pushln("call Math.divide 2"); break;
			case "&": output.pushln("and"); break;
			case "|": output.pushln("or"); break;
			case "<": output.pushln("lt"); break;
			case ">": output.pushln("gt"); break;
			case "=": output.pushln("eq"); break;
			default: console.log("expect op but " + json[i]); isError = true; return;
		}
	}
	function term_(json){
		//console.log("json length = " + json.length);
		switch(json.length){
			case 1: return;
			case 2:
				switch(json[1][0]){
					case "integerConstant": output.pushln("push constant " + json[1][1]); break;
					case "keywordConstant": keywordConstant_(json[1]); break;
					case "stringConstant": stringConstant_(json[1]); break;
					case "varName": output.pushln("push " + varName_(json[1][1])); break;
					case "subroutineCall": subroutineCall_(json[1]); break;
				}
				break;
			case 3:
				if(check("term", json[2][0])) term_(json[2]);
				if(check("unaryOp", json[1][0])) {
					if(json[1][1]=="~") output.pushln("not");
					else if(check("-", json[1][1])) output.pushln("neg");
					else {
						console.log("expect unaryOp but \"" + json[1][1] + "\"");
						isError = true;
						return;
					}
				}
				break;
			case 4:
				if(!check("(",json[1])) return;
				if(check("expression", json[2][0])) expression_(json[2]);
				if(!check(")",json[3])) return;
				break;
			case 5:
				if(!check("[",json[2])) return;
				if(check("expression", json[3][0])) expression_(json[3]);
				if(!check("]",json[4])) return;
				if(check("varName", json[1][0])) output.pushln("push " + varName_(json[1][1]));
				output.pushln("add");
				output.pushln("pop pointer 1");
				output.pushln("push that 0");
				break;
		}
	}
	function expression_(json){
		if(check("term", json[1][0])) term_(json[1]);
		for(var i=3; i<json.length; i=i+2){
			if(check("term", json[i][0])) term_(json[i]);
			if(check("op", json[i-1][0])) op_(json[i-1]);
		}
	}
	function letStatement_(json){
		//console.log(json);
		if(!check("let", json[1])) return;
		if(json[3]=="["){
			if(check("expression", json[4][0])) expression_(json[4]);
			if(!check("]", json[5])) return;
			if(!check("=", json[6])) return;
			if(check("varName", json[2][0])) output.pushln("push " + varName_(json[2][1]));
			output.pushln("add");
			if(check("expression", json[7][0])) expression_(json[7]);
			if(!check(";", json[8])) return;
			output.pushln("pop temp 0");
			output.pushln("pop pointer 1");
			output.pushln("push temp 0");
			output.pushln("pop that 0");
		}
		else{
			if(!check("=", json[3])) return;
			if(check("expression", json[4][0])) expression_(json[4]);
			if(!check(";", json[5])) return;
			if(check("varName", json[2][0])) output.pushln("pop " + varName_(json[2][1]));
		}
	}
	function ifStatement_(json){
		if(!check("if", json[1])) return;
		if(!check("(", json[2])) return;
		if(check("expression", json[3][0])) expression_(json[3]);
		if(!check(")", json[4])) return;
		var false_label = idIssuer.issue();
		output.pushln("not");
		output.pushln("if-goto " + false_label);
		if(check("statements", json[5][0])) statements_(json[5]);
		if(json.length > 6) {
			if(!check("else", json[6])) return;
			var end_label = idIssuer.issue();
			output.pushln("goto " + end_label);
			output.pushln("label " + false_label);
			if(check("statements", json[7][0])) statements_(json[7]);
			output.pushln("label " + end_label);
		} else output.pushln("label " + false_label);
	}
	function whileStatement_(json){
		//console.log(json);
		if(!check("while", json[1])) return;
		if(!check("(", json[2])) return;
		var while_label = idIssuer.issue();
		output.pushln("label " + while_label);
		if(check("expression", json[3][0])) expression_(json[3]);
		if(!check(")", json[4])) return;
		var end_label = idIssuer.issue();
		output.pushln("not");
		output.pushln("if-goto " + end_label);
		if(check("statements", json[5][0])) statements_(json[5]);
		output.pushln("goto " + while_label);
		output.pushln("label " + end_label);
	}
	function doStatement_(json){
		//console.log(json);
		if(!check("do", json[1])) return;
		if(check("subroutineCall", json[2][0])) subroutineCall_(json[2]);
		if(!check(";", json[3])) return;
		output.pushln("pop temp 0");
	}
	function returnStatement_(json){
		//console.log(json);
		if(!check("return", json[1])) return;
		if(json[2][1].length==1) output.pushln("push constant 0");
		else if(check("expression", json[2][0])) expression_(json[2]);
		output.pushln("return");
	}
	function statements_(json){
		if(!check("{", json[1])) return;
		for(var i=2; i<json.length-1; ++i) {
			switch(json[i][0]){
				case "varDec": method_sym_table.push(json[i]); break;
				case "letStatement": letStatement_(json[i]); break;
				case "ifStatement": ifStatement_(json[i]); break;
				case "whileStatement": whileStatement_(json[i]); break;
				case "doStatement": doStatement_(json[i]); break;
				case "returnStatement": returnStatement_(json[i]); break;
				default: console.log("expect statement but " + json[i][0]); isError = true; return;
			}
		}
		if(!check("}", json[json.length-1])) return;
	}
	subroutine.subroutineDec_ = function(json){
		var subroutineName;
		if(check("subroutineName", json[3][0])) subroutineName = json[3][1];
		if(!check("(", json[4])) return;
		switch(json[1]){
			case "constructor":
				output.pushln("push constant " + class_sym_table.length);
				output.pushln("call Memory.alloc 1");
				output.pushln("pop pointer 0"); break;
			case "method":
				isArgPlus1 = 1;
				output.pushln("push argument 0");
				output.pushln("pop pointer 0"); break;
			case "function": break;
			default: console.log("expect function type but \"" + json[1] + "\"");
		}
		if(check("parameterList", json[5][0])) method_sym_table.pushArgs(json[5]);
		if(!check(")", json[6])) return;
		idIssuer = IdIssuer.createNew(className + "." + subroutineName + ".", 3);
		if(check("statements", json[7][0])) statements_(json[7]);
		return "function " + className + "." + subroutineName + " " + method_sym_table.length;
	}
	return subroutine;
}
}

var CodeGener = {
createNew: function(output){
	var codeGener = {};
	codeGener.run = function(json){
		if(!check("class", json[0])) return;
		if(!check("class", json[1])) return;
		var className;
		if(check("classname", json[2][0])) className = json[2][1];
		if(!check("{", json[3])) return;
		var class_sym_table = SymbolTable.createNew();
		var last = json.length-1;
		//for(var i=4; i<12; ++i) {
		for(var i=4; i<last; ++i){
			var type = json[i][0];
			if(type=="classVarDec") class_sym_table.push(json[i]);
			else if(type=="subroutineDec") {
				var output_temp = Output.createNew();
				var subroutine = Subroutine.createNew(output_temp, className, class_sym_table);
				output.pushln(subroutine.subroutineDec_(json[i]));
				output.push(output_temp.getOutText());
			}
		}
		if(!check("}", json[last])) return;
	}
	return codeGener;
}
}

function codegen(json){
	var output = Output.createNew();
	var codeGener = CodeGener.createNew(output);
	codeGener.run(json);
	return output.getOutText();
}

exports.codegen = codegen;
