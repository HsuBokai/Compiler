
var Stream = {
createNew: function(arr, len){
		   var stream = {};
		   var current;
		   var isDoubleQuate;
		   stream.isEnd = function(){ return current >= len || current < 0; }
		   stream.next = function(){ return arr.charAt(current++); }
		   stream.nextWord = function(){
			   function isSpace(c){ return c==" " || c=="\t" || c=="\n" || c=="\r"; }
			   function isComment(){
				   if(current < len-1 && arr.charAt(current) == "/" && arr.charAt(current+1) == "/"){
					   while(current < len && arr.charAt(current) != "\n") ++current;
					   return true;
				   }
				   else if(current < len-1 && arr.charAt(current) == "/" && arr.charAt(current+1) == "*"){
					   while(current < len-1 && !(arr.charAt(current) == "*" && arr.charAt(current+1) == "/")) ++current;
					   ++current;
					   return true;
				   }
				   else if(current < len && isSpace(arr.charAt(current))) return true;
				   else return false;
			   }
			   function isSymbol(c){
				   return c=="/" || c=="{" || c=="}" || c=="[" || c=="]" || c=="(" || c==")" || c=="," || c==";" || c=="<" || c==">" || c=="=" || c=="." || c=="+" || c=="-" || c=="~" || c=="*" || c=="&" || c=="|";
			   }
			   if(isDoubleQuate == true){
				   isDoubleQuate = false;
				   var start = current;
				   while(current<len && arr.charAt(current)!="\"") ++current;
				   ++current;
				   return arr.slice(start,current-1);
			   }
			   while( isComment() ) ++current;
			   if(current >= len) return "";
			   var start = current;
			   ++current;
			   if(arr.charAt(start)=="\""){
				   isDoubleQuate = true;
				   return "\"";
			   }
			   if(!isSymbol(arr.charAt(start))) {
				   while(current < len && !(isSpace(arr.charAt(current)) || isSymbol(arr.charAt(current))) ) ++current;
			   }
			   //console.log(arr.slice(start, current));
			   return arr.slice(start, current);
		   }
		   stream.backOnce = function(){ --current; }
		   stream.reset = function(){ 
			   current=0; 
			   isDoubleQuate = false;
		   }
		   stream.reset();
		   return stream;
	   }
}
var TokenAnalyzer = {
createNew: function(stream){
		   var tokenAnalyzer = {};
		   var isEnd;
		   function next(){
			   if(isEnd == true || stream.isEnd()) return "";
			   else return stream.nextWord();
		   }
		   function check_push(test, c, json){
			   if(test != c){
				   console.log("expect \'" + c + "\' but \'" + test + "\'");
				   isEnd = true;
			   }
			   else json.push(c);
		   }
		   function leaf_push(type, value, json){
			   var temp = [type, value];
			   json.push(temp);
		   }
		   function isOp(c){
			   return c=="+" || c=="-" || c=="*" || c=="/" || c=="&" || c=="|" || c=="<" || c==">" || c=="=";
		   }
		   function subroutineCall_(test, test2){
			   var json = ["subroutineCall"];
			   if(test2 == "."){
				   json.push(test);
				   json.push(".");
				   test = next();
				   test2 = next();
			   }
			   leaf_push("subroutineName", test, json);
			   check_push(test2, "(", json);
			   do{
				   json.push(expression_(",", ")"));
				   stream.backOnce();
			   } while(isEnd == false && next() != ")");
			   json.push(")");
			   return json;
		   }
		   function term_(end, end2){
			   var json = ["term"];
			   var test = next();
			   if(test == "-" || test == "~"){
				   leaf_push("unaryOp", test, json);
				   json.push(term_(end, end2));
				   return json;
			   }
			   if(test == "("){
				   json.push("(");
				   json.push(expression_(")", ")"));
				   json.push(")");
				   return json;
			   }
			   if(test==end || test==end2){
				   stream.backOnce();
				   return json;
			   }
			   if(!Number.isNaN(Number.parseInt(test))){
				   leaf_push("integerConstant", test, json);
				   return json;
			   }
			   if(test == "true" || test == "false" || test == "null" || test == "this"){
				   leaf_push("keywordConstant", test, json);
				   return json;
			   }
			   if(test=="\""){
				   leaf_push("stringConstant", next(), json);
				   return json;
			   }
			   var test2 = next();
			   if(test2==end || test2==end2 || isOp(test2)){
				   leaf_push("varName", test, json);
				   stream.backOnce();
				   return json;
			   }
			   if(test2=="["){
				   leaf_push("varName", test, json);
				   json.push("[");
				   json.push(expression_("]", "]"));
				   json.push("]");
				   return json;
			   }
			   if(test2=="(" || test2=="."){
				   json.push(subroutineCall_(test, test2));
				   return json;
			   }
			   console.log("unexpected term");
			   isEnd = true;
			   return json;
		   }
		   function expression_(end, end2){
			   var json = ["expression"];
			   json.push(term_(end, end2));
			   var test = next();
			   while(isEnd == false && !(test == end || test == end2)){
				   if(isOp(test)) leaf_push("op", test, json);
				   else{
					   console.log("expect op but \'" + test + "\'");
					   isEnd = true;
				   }
				   json.push(term_(end, end2));
				   test = next();
			   }
			   return json;
		   }
		   function Dec(json){
			   json.push(next());
			   json.push(next());
			   var test;
			   while(isEnd == false && (test = next()) != ";"){
				   check_push(test, ",", json);
				   json.push(next());
			   }
			   json.push(";");
		   }
		   function classVarDec_(input){
			   var json = ["classVarDec", input];
			   Dec(json);
			   return json;
		   }
		   function varDec_(){
			   var json = ["varDec", "var"];
			   Dec(json);
			   return json;
		   }
		   function letStatement_(){
			   var json = ["letStatement", "let"];
			   leaf_push("varName", next(), json);
			   var test = next();
			   if(test == "["){
				   json.push("[");
				   json.push(expression_("]", "]"));
				   json.push("]");
				   test = next();
			   }
			   if(test == "="){
				   json.push("=");
				   json.push(expression_(";", ";"));
				   json.push(";");
			   }
			   else{
				   console.log("expect \'=\' but \'" + test + "\'");
				   isEnd = true;
			   }
			   return json;
		   }
		   function ifStatement_(){
			   var json = ["ifStatement", "if"];
			   check_push(next(), "(", json);
			   json.push(expression_(")", ")"));
			   json.push(")");
			   json.push(statements_());
			   return json;
		   }
		   function whileStatement_(){
			   var json = ["whileStatement", "while"];
			   check_push(next(), "(", json);
			   json.push(expression_(")", ")"));
			   json.push(")");
			   json.push(statements_());
			   return json;
		   }
		   function doStatement_(){
			   var json = ["doStatement", "do"];
			   json.push(subroutineCall_(next(), next()));
			   check_push(next(), ";", json);
			   return json;
		   }
		   function returnStatement_(){
			   var json = ["returnStatement", "return"];
			   json.push(expression_(";",";"));
			   json.push(";");
			   return json;
		   }
		   function statements_(){
			   var json = ["statements"];
			   check_push(next(), "{", json);
			   var test;
			   var ifjson = [];
			   while(isEnd == false && (test = next()) != "}")
			   {
				   if(ifjson.length != 0){
					   if(test == "else"){
						   ifjson.push("else");
						   ifjson.push(statements_());
					   }
					   json.push(ifjson);
					   ifjson = [];
				   }
				   switch(test){
					   case "var": json.push(varDec_()); break;
					   case "let": json.push(letStatement_()); break;
					   case "if": ifjson = ifStatement_(); break;
					   case "else": break;
					   case "while": json.push(whileStatement_()); break;
					   case "do": json.push(doStatement_()); break;
					   case "return": json.push(returnStatement_()); break;
					   default: console.log("unexpected"); isEnd = true;
				   }
			   }
			   if(ifjson.length != 0) json.push(ifjson);
			   json.push("}");
			   return json;
		   }
		   function parameterList_(){
			   var json = ["parameterList"];
			   var test = next();
			   if(test == ")") return json;
			   else {
				   json.push(test);
				   json.push(next());
			   }
			   while(isEnd == false && (test = next()) != ")"){
				   check_push(test, ",", json);
				   json.push(next());
				   json.push(next());
			   }
			   return json;
		   }
		   function subroutineDec_(input){
			   var json = ["subroutineDec"];
			   json.push(input);
			   json.push(next());
			   leaf_push("subroutineName", next(), json);
			   check_push(next(), "(", json);
			   json.push(parameterList_());
			   json.push(")");
			   json.push(statements_());
			   return json;
		   }
		   function class_(input){
			   var json = ["class"];
			   json.push(input);
			   leaf_push("classname", next(), json);
			   check_push(next(), "{", json);
			   var test;
			   while(isEnd == false && (test = next()) != "}")
			   {
				   switch(test){
					   case "static":
					   case "field": json.push(classVarDec_(test)); break;
					   case "constructor":
					   case "function":
					   case "method": json.push(subroutineDec_(test)); break;
					   default: console.log("unexpected"); isEnd = true;
				   }
			   }
			   json.push("}");
			   return json;
		   }
		   tokenAnalyzer.reset = function(){
			   isEnd = false;
		   }
		   tokenAnalyzer.run = function(){
			   tokenAnalyzer.reset();
			   var test = next();
			   switch(test){
				   case "": break;
				   case "class": return class_(test);
				   default: console.log("begin without class"); isEnd = true;
			   }
			   return [];
		   }
		   tokenAnalyzer.reset();
		   return tokenAnalyzer;
	   }
}

function tokenAnalyze(inText){
	var stream = Stream.createNew(inText, inText.length);
	var tokenAnalyzer = TokenAnalyzer.createNew(stream);
	return tokenAnalyzer.run();
}

exports.tokenAnalyze = tokenAnalyze;

