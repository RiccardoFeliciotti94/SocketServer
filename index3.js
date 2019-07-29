let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
var gioc = [];
var ins = [];
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var xmlHttp = new XMLHttpRequest();
xmlHttp.open( "GET", 'http://riccardohosts.ddns.net:8080/getLastBid.php', false );
xmlHttp.send();
var js = JSON.parse(xmlHttp.responseText);
js.forEach(element => {
  gioc.push(element.Nickname);
  ins.push(element.Nickname);
});
var xmlHttp = new XMLHttpRequest();
xmlHttp.open( "GET", 'http://riccardohosts.ddns.net:8080/getAstaId.php', false );
xmlHttp.send();
var astaId = JSON.parse(xmlHttp.responseText)[0].Id;
var dictUsrsSquId = {}
var https = new XMLHttpRequest();
var url = "http://riccardohosts.ddns.net:8080/getSquIdUsrs.php";
var params = JSON.stringify({ username: astaId });
https.open("POST", url, false);
https.onreadystatechange = function() {
    if(https.readyState == 4 && https.status == 200) {
        var a = JSON.parse(https.responseText);
        for(var key in a){
          dictUsrsSquId[a[key].Nickname] = a[key].Id
        }
    }
}
https.send(params);
var usr = [];
var dictGiocUsrs = {};
var indexUsers = 0;
var countdown = 10;
var interval;
var rand;
var e = 0;
var giocScore = {}

for(var j = 0; j<js.length; j++){
  giocScore[js[j].Nickname] = 0;
}

io.on('connection', (socket) => {
  socket.on('disconnect', function(){
    io.sockets.emit('users-changed', {user: socket.nickname, event: 'left'});
    for (var i=usr.length-1; i>=0; i--) {
      if (usr[i] === socket.nickname) {
          usr.splice(i, 1);
          indexUsers = indexUsers - 1;
          break;
      }
    }
    clearInterval(interval);
  });
  function getNickUsr(nickname){
    dictGiocUsrs[nickname] = [];
    var xmlHttp = new XMLHttpRequest();
    var url = "http://riccardohosts.ddns.net:8080/getNicknameUser.php";
    var params = JSON.stringify({ username: nickname });
    xmlHttp.open("POST", url, false);
    xmlHttp.onreadystatechange = function() {
      if(xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        var a = JSON.parse(xmlHttp.responseText);
        for (var i=gioc.length-1; i>=0; i--) {
          if (gioc[i] === a[0].Nickname) {
            dictGiocUsrs[nickname].push(gioc[i]);
            gioc.splice(i, 1);
            break;
          }
        }
      }
    }
    xmlHttp.send(params);
    
  }
  socket.on('set-nickname', (nickname) => {
    socket.nickname = nickname;
    usr.push(nickname);
    io.sockets.emit('users-changed', {user: nickname, event: 'joined', index: indexUsers});
    indexUsers = indexUsers + 1;
    if(usr.length == 2){startBid();}   
  });
  function startBid(){
    for(var i = 0; i < usr.length; i++){
      getNickUsr(usr[i]);
    }
    console.log(dictGiocUsrs);
    nick1 = usr[1];
    nick2 = usr[0];
    money = 50;
    io.sockets.emit('set-bidders', {usr: nick1, usr2: nick2, money: money});
    rand = Math.floor(Math.random() * (gioc.length - 0)) + 0;
    io.sockets.emit('player-load', {player: gioc[rand], players: gioc});
    interval = setInterval(doInterval, 1000);
  
  }

  function setWinner(){
    clearInterval(interval);
    countdown = 10;
    e = 0;
    io.emit('winners', {data:0});
    interval = setInterval(doInterval,1000);
  }
  function doInterval(){
    if(countdown == 0){setWinner();}
    io.sockets.emit('timer', { countdown: countdown });
    countdown--;
  }
  socket.on('results', (message) => {
    if(message['usr']=="skip" && e == 0){
      if(gioc.length == 1){
        io.sockets.emit('player-load', {player: gioc[0], players: gioc});
      }else{
        var g;
        for (var i=gioc.length-1; i>=0; i--) {
          if (gioc[i] === gioc[rand]) {
            g = gioc[rand];
            gioc.splice(i, 1);
            break;
          }
        }
        console.log(g);
        rand = Math.floor(Math.random() * (gioc.length - 0)) + 0;
        io.sockets.emit('player-load', {player: gioc[rand], players: gioc});
        console.log(gioc[rand]);
        gioc.push(g);
      }
    }
    else if (message['usr']!="skip" && e == 0){
      giocScore[gioc[rand]] = message['score'];
      console.log(giocScore);
      var arr = dictGiocUsrs[message['usr']];
      arr.push(gioc[rand]);
      dictGiocUsrs[message['usr']] = arr;
      console.log(dictGiocUsrs)
      for (var i=gioc.length-1; i>=0; i--) {
        if (gioc[i] === gioc[rand]) {
          gioc.splice(i, 1);
          break;
        }
      }
      if(arr.length == 5){
        var a;
        var l = [];
        for(var j = 0; j < usr.length; j++){
          if(usr[j] !== message['usr']) a = usr[j];
        }
        dictGiocUsrs[a] = arr_diff(dictGiocUsrs[message['usr']], ins);
        io.sockets.emit('finish', {data:dictGiocUsrs});
        updateDB();
        clearInterval(interval);
      }
      if(gioc.length == 0){
        io.sockets.emit('finish', {data:dictGiocUsrs});
        updateDB();
        clearInterval(interval);
      }
      else{
        rand = Math.floor(Math.random() * (gioc.length - 0)) + 0;
        io.sockets.emit('player-load', {player: gioc[rand], players: gioc});
      }
      
    }
    e++;
  });

  socket.on('add-message', (message) => {
    countdown = 10;
    io.sockets.emit('message', {text: message.text, from: socket.nickname});
  });
});
 
var port = process.env.PORT || 3002;

function updateDB(){
  for (var key in dictGiocUsrs){
    for(var i = 0; i < dictGiocUsrs[key].length; i++){
      var https = new XMLHttpRequest();
      var url = "http://riccardohosts.ddns.net:8080/insertSquAstGio.php";
      var c = 0;
      for (var j = 0; j<js.length; j++){
        if(js[j].Nickname === dictGiocUsrs[key][i] ) {
          c = js[j].Id;
          break;
        }
      }
      var params = JSON.stringify({ giocatore: c, squadraAstaId : dictUsrsSquId[key], prezzo : giocScore[dictGiocUsrs[key][i]] });
      https.open("POST", url, false);
      https.send(params);
    }
  }
  var https = new XMLHttpRequest();
  var url = "http://riccardohosts.ddns.net:8080/updateAstaData.php";
  var params = JSON.stringify({ username : astaId });
  https.open("POST", url, false);
  https.send(params);
}

function arr_diff (a1, a2) {

  var a = [], diff = [];

  for (var i = 0; i < a1.length; i++) {
      a[a1[i]] = true;
  }

  for (var i = 0; i < a2.length; i++) {
      if (a[a2[i]]) {
          delete a[a2[i]];
      } else {
          a[a2[i]] = true;
      }
  }

  for (var k in a) {
      diff.push(k);
  }

  return diff;
}

http.listen(port, function(){
   console.log('listening in http://localhost:' + port);
});


